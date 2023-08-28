#![allow(dead_code)]

use std::{fs, path::PathBuf};

use anyhow::{anyhow, bail, Result};
use sscanf::sscanf;

use crate::conf::Conf;

#[derive(Debug, PartialEq, Eq)]
pub enum DirectiveVariants {
    Include(PathBuf),
    // Using(PathBuf),
    // Slot,
}

fn parse_path_arg(args: &mut Vec<&str>) -> Result<PathBuf> {
    if args.is_empty() {
        bail!("expected a path argument to a directive");
    }

    let mut next = args.remove(0);
    if next.starts_with('"') && next.ends_with('"') {
        next = sscanf!(next, "\"{str}\"").unwrap();
    }

    Ok(PathBuf::from(next))
}

impl DirectiveVariants {
    fn new(name: &str, mut args: Vec<&str>, conf: &Conf) -> Result<Self> {
        Ok(match name {
            "include" => {
                let rel = parse_path_arg(&mut args)?;
                DirectiveVariants::Include([&conf.root, &conf.include_base, &rel].iter().collect())
            }
            /*
            "using" => {
                let rel = parse_path_arg(&mut args)?;
                DirectiveVariants::Using([&conf.root, &conf.layouts, &rel].iter().collect())
            }
            "slot" => DirectiveVariants::Slot,
            */
            uk => bail!("unknown directive: '{}'", uk),
        })
    }
}

#[derive(Debug)]
pub struct Directive {
    pub variant: DirectiveVariants,
    pub file: PathBuf,
}

pub fn get_all_directives(file: &PathBuf, conf: &Conf) -> Result<Vec<Directive>> {
    let mut contents = fs::read_to_string(file)?;
    let mut directives = Vec::new();

    while let Some(s_idx) = contents.find("<!---") {
        let e_idx = contents.find("--->").ok_or_else(|| {
            let until: String = contents.drain(..s_idx).collect();
            let line = until.lines().collect::<Vec<&str>>().len();
            let column = until.len() - until.rfind('\n').unwrap_or(0);
            anyhow!(
                "directive comment not closed (began at {}:{})",
                line,
                column
            )
        })? + 4;

        let comment = contents.drain(s_idx..e_idx).collect::<String>();
        let content = sscanf!(comment, "<!---{str}--->").unwrap().trim();

        if !content.starts_with('@') {
            bail!("directives should start with an '@'");
        }

        let mut args = content[1..].split(" ").collect::<Vec<&str>>();
        if args.is_empty() {
            bail!("expected a directive name");
        }

        let name = args.remove(0);
        directives.push(Directive {
            file: file.to_path_buf(),
            variant: DirectiveVariants::new(name, args, conf)?,
        });
    }

    Ok(directives)
}
