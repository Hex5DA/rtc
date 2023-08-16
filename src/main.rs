use clap::Parser;
use std::{path::Path, process};

mod conf;

#[derive(Parser)]
struct Args {
    config: Option<String>,
}

fn main() {
    let args = Args::parse();
    let conf = conf::parse(args.config.as_ref().map(Path::new)).unwrap_or_else(|errs| {
        eprintln!("errors whilst parsing args:\n{}", errs);
        process::exit(1);
    });
    println!("config generated: {:#?}", conf);
}
