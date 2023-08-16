#![allow(dead_code)]

use anyhow::{bail, Context, Result};
use std::{collections::HashMap, fs, path::Path};

#[derive(Debug)]
pub enum RelPaths {
    Base,
    Root,
    Arbritrary(String),
}

impl From<&str> for RelPaths {
    fn from(s: &str) -> Self {
        match s {
            "base" => RelPaths::Base,
            "root" => RelPaths::Root,
            arbritrary => RelPaths::Arbritrary(arbritrary.to_string()),
        }
    }
}

#[derive(Debug)]
pub struct Conf {
    root: String,
    pages: String,
    errors: String,
    components: String,
    layouts: String,
    dist: String,
    rel_paths: RelPaths,
}

fn blank_or_empty(str: &str) -> bool {
    str.trim().is_empty()
}

pub fn parse(path: &Path) -> Result<Conf> {
    let mut options = HashMap::new();
    let contents;
    if path.try_exists().context("file not readable")? {
        contents = fs::read_to_string(path).context("error whilst reading from file")?;
        let lines = contents.split('\n').collect::<Vec<&str>>();
        let mut errs = Vec::new();

        for (idx, line) in lines.iter().enumerate() {
            if blank_or_empty(line) {
                continue;
            }

            if line.starts_with("//") {
                continue;
            }

            if let Some(segments) = line.split_once(':') {
                if blank_or_empty(segments.0) || blank_or_empty(segments.1) {
                    errs.push(format!(
                        "rule names and/or values may not be blank - line {}",
                        idx + 1
                    ));
                    continue;
                }

                options.insert(segments.0.trim(), segments.1.trim());
            } else {
                errs.push(format!(
                    "expected a ':' delimeter in the config - line {}",
                    idx + 1
                ));
                continue;
            }
        }

        if !errs.is_empty() {
            bail!(errs.join("\n"));
        }
    }

    #[rustfmt::skip]
    let conf = Conf {
        root: options.remove("root").unwrap_or(".").to_string(),
        pages: options.remove("pages").unwrap_or("pages/").to_string(),
        errors: options.remove("errors").unwrap_or("errors/").to_string(),
        components: options.remove("components").unwrap_or("components/").to_string(),
        layouts: options.remove("layouts").unwrap_or("layouts/").to_string(),
        dist: options.remove("dist").unwrap_or("dist/").to_string(),
        rel_paths: options.remove("rel_paths").unwrap_or("base").into(),
    };

    if !options.is_empty() {
        bail!(
            "unknown rules: {}",
            options.into_keys().collect::<Vec<&str>>().join(", ")
        );
    }

    Ok(conf)
}
