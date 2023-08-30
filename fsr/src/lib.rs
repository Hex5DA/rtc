#![allow(dead_code)]
// an implementation of the HTTP/1.1 standard, as presented here:
// <https://datatracker.ietf.org/doc/html/rfc9112>
// more resources on the HTTP specification can be found here:
// <https://developer.mozilla.org/en-US/docs/Web/HTTP/Resources_and_specifications>

use std::collections::VecDeque;
use std::io::{prelude::*, BufReader};
use std::net::TcpListener;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Errors>;

// then a Errors::into_http_err() method which turns it into the
// appropriate error code.

#[derive(Error, Debug)]
pub enum Errors {
    #[error("a request line's components should be seperated by a single whitespace")]
    UnecessaryWhitespaceInRequestLine,
    #[error("no start line was provided")]
    NoStartLine,
    #[error("unrecognised method '{0}'")]
    UnrecognisedMethod(String),
    #[error("a request method was not provided")]
    NoMethod,
    #[error("no request target")]
    NoReqTarget,
    #[error("no HTTP version")]
    NoHttpVersion,
    #[error("invalid requets target provided - '{0}'")]
    UnrecognisedReqTarget(String),
    #[error("HTTP version invalid - likely formatted incorrectly.")]
    InvalidHttpVersion,
    #[error("invalid header name - contained whitespace")]
    InvalidHeaderNameWhitespace,
    #[error("invalid header - no delimiter")]
    InvalidHeaderNoDel,
    #[error("expected a '\\r\\n' token, eg. at the end of a request line")]
    NoRnToken,
    #[error("the request was not valid UTF-8")]
    NotValidUtf8,
}

/// as defined here:
/// <https://www.rfc-editor.org/rfc/rfc9110#section-9?
#[derive(Debug)]
pub enum Method {
    Get,
    Head,
    Post,
    Put,
    Delete,
    Connect,
    Options,
    Trace,
}

impl TryInto<Method> for String {
    type Error = Errors;
    fn try_into(self) -> std::result::Result<Method, Self::Error> {
        use Method::*;
        Ok(match self.as_str() {
            "GET" => Get,
            "HEAD" => Head,
            "POST" => Post,
            "PUT" => Put,
            "DELETE" => Delete,
            "CONNECT" => Connect,
            "OPTIONS" => Options,
            "TRACE" => Trace,
            _ => return Err(Errors::UnrecognisedMethod(self)),
        })
    }
}

// these are massively broken!
#[derive(Debug)]
pub enum ReqTarget {
    OriginForm {
        path: String,
        query: Option<String>,
    },
    // TODO: does this form have a query component? it is not listed here..
    //       <https://datatracker.ietf.org/doc/html/rfc9112#name-absolute-form>
    AbsoluteForm(String),
    AuthorityForm {
        // can this be replace with a SocketAddr?
        host: String,
        port: u64,
    },
    AsteriskForm,
}

impl TryInto<ReqTarget> for String {
    type Error = Errors;
    fn try_into(self) -> std::result::Result<ReqTarget, Self::Error> {
        if self == "*" {
            return Ok(ReqTarget::AsteriskForm);
        }
        // this is unbelievably crude
        // if there's a `:`, and the part after it is a numbe,r we take it to be an AuthorityForm
        // (www.example.com:80), but if not, an absolute URL (https**:**//www.example.com).
        if self.contains(":") {
            let (lpart, rpart) = self.rsplit_once(":").unwrap();
            return Ok(match rpart.parse::<u64>() {
                Ok(port) => ReqTarget::AuthorityForm {
                    host: lpart.to_string(),
                    port,
                },
                Err(_) => ReqTarget::AbsoluteForm(self),
            });
        }
        let (mut path, mut query) = (self.clone(), None);
        if self.contains("?") {
            let (url, some_query) = self.rsplit_once("?").unwrap();
            (path, query) = (url.to_string(), Some(some_query.to_string()));
        }

        return Ok(ReqTarget::OriginForm { path, query });
    }
}

#[derive(Debug)]
pub struct HttpVersion(usize, usize);
impl TryInto<HttpVersion> for String {
    type Error = Errors;
    fn try_into(self) -> std::result::Result<HttpVersion, Self::Error> {
        let ver = self
            .strip_prefix("HTTP/")
            .ok_or(Errors::InvalidHttpVersion)?;
        let nums = ver
            .split(".")
            .map(|c| c.parse::<usize>())
            .collect::<Vec<_>>();
        if nums.len() != 2 || nums.iter().any(|n| n.is_err()) {
            return Err(Errors::InvalidHttpVersion);
        }

        Ok(HttpVersion(
            nums[0].clone().unwrap(),
            nums[1].clone().unwrap(),
        ))
    }
}

#[derive(Debug)]
pub enum StartLine {
    // request
    RequestLine {
        method: Method,
        request_target: ReqTarget,
        http_version: HttpVersion,
    },
    // response
    StatusLine {},
}

// NOTE: what does this mean?
// 'A recipient MUST parse an HTTP message as a sequence of octets in an encoding that is a
// superset of US-ASCII [USASCII].'
// ~ <https://datatracker.ietf.org/doc/html/rfc9112#name-message-parsing>
// this should be fine, right? rust's unicode stirng's are supersets of ascii?

pub type Headers = std::collections::HashMap<String, String>;

#[derive(Debug)]
pub struct Message {
    start_line: StartLine,
    field_lines: Headers,
    body: String,
}

pub struct MessageParser {
    request: String,
    lines: VecDeque<String>,
}

impl MessageParser {
    fn new(request: String) -> Self {
        Self {
            lines: request
                .clone()
                .split_inclusive("\r\n")
                .map(|s| s.to_string())
                .collect(),
            request,
        }
    }

    fn parse(&mut self) -> Result<Message> {
        Ok(Message {
            start_line: self.parse_request_line()?,
            field_lines: self.parse_headers()?,
            body: self
                .lines
                .clone()
                .into_iter()
                .collect::<Vec<String>>()
                .join(""),
        })
    }

    fn parse_headers(&mut self) -> Result<Headers> {
        let mut headers = Headers::new();
        while let Some(line) = self.lines.pop_front() {
            if line == "\r\n" {
                break; // we have reached the message body
            }
            match line.split_once(":") {
                None => return Err(Errors::InvalidHeaderNoDel),
                Some((field_name, field_value)) => {
                    if field_name.chars().any(|ch| ch.is_whitespace()) {
                        return Err(Errors::InvalidHeaderNameWhitespace);
                    }
                    headers.insert(field_name.to_string(), field_value.trim().to_string());
                }
            }
        }

        Ok(headers)
    }

    fn parse_request_line(&mut self) -> Result<StartLine> {
        let stfu_borrow_checker = self.lines.pop_front().ok_or(Errors::NoStartLine)?;
        let request_line = stfu_borrow_checker.split(" ").collect::<Vec<_>>();

        if request_line.iter().any(|c| c.is_empty()) {
            return Err(Errors::UnecessaryWhitespaceInRequestLine);
        }

        let method = request_line
            .get(0)
            .ok_or(Errors::NoMethod)?
            .to_string()
            .try_into()?;
        let request_target = request_line
            .get(1)
            .ok_or(Errors::NoReqTarget)?
            .to_string()
            .try_into()?;
        let http_version = request_line
            .get(2)
            .ok_or(Errors::NoHttpVersion)?
            .strip_suffix("\r\n")
            .ok_or(Errors::NoRnToken)?
            .to_string()
            .try_into()?;

        Ok(StartLine::RequestLine {
            method,
            request_target,
            http_version,
        })
    }
}

fn handle_err(_err: Errors) {
    todo!()
}

pub fn listen(port: u64) {
    let tcp = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();

    for stream in tcp.incoming() {
        let mut reader = BufReader::new(stream.unwrap());
        let buf = reader.fill_buf().unwrap().to_vec();
        reader.consume(buf.len());
        let msg = match String::from_utf8(buf) {
            Ok(req) => match MessageParser::new(req).parse() {
                Ok(msg) => msg,
                Err(err) => {
                    handle_err(err);
                    continue;
                }
            },
            Err(_err) => {
                handle_err(Errors::NotValidUtf8);
                continue;
            }
        };


        println!("message: {:#?}", msg);
    }
}
