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
