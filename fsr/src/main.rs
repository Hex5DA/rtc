/*
use fsr::*;

use std::io::{prelude::*, BufReader};
use std::net::TcpListener;



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

fn main() {
    listen(8080);
}
*/

use regex::{Captures, Regex};
use std::{fs, path::PathBuf, process::Command};
use tide::{http::mime, Request, *};

static DIST: &str = "dist/";

fn walk_dir(dir: &PathBuf) -> Result<Vec<PathBuf>> {
    assert!(dir.is_dir());

    let mut entries: Vec<PathBuf> = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path: PathBuf = entry.path().into();
        if path.is_dir() {
            entries.append(&mut walk_dir(&path)?);
        } else {
            entries.push(entry.path().into());
        }
    }

    Ok(entries)
}

fn get_temp_file() -> PathBuf {
    let file = Command::new("mktemp").output().unwrap().stdout;
    let str = String::from_utf8_lossy(&file);
    PathBuf::from(str.to_string())
}

async fn page(req: Request<()>, path: String, slugs: Vec<String>) -> tide::Result {
    let mut resolved_slugs = Vec::new();
    for slug in &slugs {
        resolved_slugs.push(req.param(&slug)?);
    }

    let temp = get_temp_file();
    let stdout = Command::new("node")
        .args([
            "/home/0x5da/projects/rtc/ssr/index.js".to_string(),
            path,
            temp.display().to_string(),
            "--slugs".to_string(),
            format!("\"{}\"", resolved_slugs.join(",")),
            "--query".to_string(),
            format!("\"{}\"", req.url().query().unwrap_or("")),
        ])
        .output()
        .unwrap()
        .stdout;

    println!(
        "[ DBG ] SSR-er output:\n{}\n[ DBG ] output end\n",
        String::from_utf8_lossy(&stdout)
    );

    let page = fs::read_to_string(&temp).unwrap();
    fs::remove_file(temp).unwrap();
    Ok(Response::builder(200)
        .body(page)
        .content_type(mime::HTML)
        .build())
}

lazy_static::lazy_static! {
    static ref DYN_RE: Regex = Regex::new(r#"\[([\w ]+)\]"#).unwrap();
}

#[async_std::main]
async fn main() -> tide::Result<()> {
    let mut app = tide::new();

    for file in walk_dir(&PathBuf::from(DIST)).unwrap() {
        if file.is_file() {
            let stem = file.file_stem().unwrap();
            let mut parent = file
                .parent()
                .unwrap()
                .strip_prefix(DIST)
                .unwrap()
                .to_path_buf();

            parent.push(stem);
            let raw_path = parent.to_string_lossy();
            let mut slugs = Vec::new();
            let path = DYN_RE.replace(&raw_path, |cap: &Captures| {
                    let slug = &cap[1];
                    slugs.push(slug.to_string());
                    format!(":{}", slug)
                });

            let path = path.trim_end_matches("index");
            let path = path.trim_start_matches("dist");
            let path = format!("/{}", path);

            app.at(&path).get(move |req| {
                page(
                    req,
                    fs::canonicalize(&file).unwrap().display().to_string(),
                    slugs.clone(),
                )
            });
        }
    }

    app.listen("localhost:8080").await?;
    Ok(())
}
