use clap::Parser;
use std::{path::Path, process};

mod conf;

#[derive(Parser)]
struct Args {
    #[arg(default_value_t = String::from("rtc.conf"))]
    config_file: String,
}

fn main() {
    let args = Args::parse();
    let conf = conf::parse(Path::new(&args.config_file)).unwrap_or_else(|errs| {
        eprintln!("errors whilst parsing args:\n{}", errs);
        process::exit(1);
    });
    println!("config generated: {:#?}", conf);
}
