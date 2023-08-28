#![allow(dead_code)]

use anyhow::{bail, Context, Result};
use std::{
    collections::HashMap,
    fs::{self, File},
    path::{Path, PathBuf}, io::Write,
};

#[derive(Debug, Default)]
pub enum RelPaths {
    #[default]
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
    pub root: PathBuf,
    pub pages: PathBuf,
    // pub errors: PathBuf,
    // pub layouts: PathBuf,
    pub dist: PathBuf,
    pub include_base: PathBuf,
    pub rel_paths: RelPaths,
}

impl Default for Conf {
    fn default() -> Self {
        Self {
            root: PathBuf::from("."),
            pages: PathBuf::from("pages/"),
            dist: PathBuf::from("dist/"),
            include_base: PathBuf::from("components/"),
            rel_paths: RelPaths::default(),
        }
    }
}

fn blank_or_empty(str: &str) -> bool {
    str.trim().is_empty()
}

pub fn parse(path: Option<&Path>) -> Result<Conf> {
    let path = if let Some(path) = path {
        if !path.try_exists().context("file not readable")? {
            bail!(
                "specified config file '{}' does not exist",
                path.to_str().unwrap()
            );
        }
        path
    } else {
        Path::new("rtc.conf")
    };

    let mut options = HashMap::new();
    let mut errs = Vec::new();
    let contents;
    if path.exists() {
        contents = fs::read_to_string(path).context("error whilst reading from file")?;
        let lines = contents.split('\n').collect::<Vec<&str>>();

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

    let get_opt = |name| {
        options.remove(name).unwrap_or_else(|| {
            errs.push(format!("config option '{}' not found", name));
            ""
        })
    };

    let conf = Conf {
        root: get_opt("root").into(),
        pages: get_opt("pages").into(),
        // layouts: get_opt("layouts"),
        dist: get_opt("dist").into(),
        include_base: get_opt("include_base").into(),
        rel_paths: get_opt("rel_paths").into(),
    };

    if !options.is_empty() {
        errs.push(format!(
            "unknown rules: {}",
            options.into_keys().collect::<Vec<&str>>().join(", ")
        ));
    }

    if !errs.is_empty() {
        bail!(errs.join("\n"));
    }

    Ok(conf)
}

static RTC_CONF_DEFAULT: &str = r"
// you may want to change this to `src/`
root: .
pages: pages/
dist: dist/
include_base: components/
rel_paths: base
";

fn generate_conf(path: &PathBuf) -> Result<()> {
    let file = File::create(path).context("could not create config file - does it already exist?")?;
    write!(file, "{}", RTC_CONF_DEFAULT);
    Ok(())
}

