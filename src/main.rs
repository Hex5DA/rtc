use anyhow::Result;
use clap::{Parser, Subcommand};
use std::{
    fs,
    path::{Path, PathBuf},
    process,
};

use crate::directives::{get_all_directives, DirectiveVariants};

mod conf;
mod directives;

#[derive(Subcommand)]
enum Commands {
    Build,
    Check,
    Serve,
    Init,
    New,
}

#[derive(Parser)]
struct Args {
    /// command to run
    #[command(subcommand)]
    command: Commands,
    /// path to an alternative config. default: `rtc.conf`
    config: Option<String>,
}

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

fn main() {
    let args = Args::parse();
    let conf = conf::parse(args.config.as_ref().map(Path::new)).unwrap_or_else(|errs| {
        eprintln!("errors whilst parsing args:\n{}", errs);
        process::exit(1);
    });
    println!("config generated: {:#?}", conf);

    match args.command {
        Commands::Check => {
            let pages = walk_dir(&conf.pages.clone().into()).unwrap();
            for page in pages {
                let directives = get_all_directives(&page, &conf).unwrap_or_else(|e| {
                    eprintln!("error raised whilst aggregating directives:\n{}", e);
                    process::exit(1);
                });
                if !directives
                    .iter()
                    .any(|d| matches!(d.variant, DirectiveVariants::Using(_)))
                {
                    eprintln!(
                        "page '{}' does not use a template. ({})",
                        page.file_name().unwrap().to_str().unwrap(),
                        page.to_str().unwrap()
                    );
                    process::exit(1);
                }
                println!("directives:\n{:#?}", directives);
            }
        }
        _ => unimplemented!(),
    }
}
