use std::{
    fs::{self, File},
    io::Write,
    path::PathBuf,
};

use anyhow::Result;
use lazy_static::lazy_static;
use regex::{Captures, Regex, NoExpand};

lazy_static! {
    static ref COMP_REG: Regex =
        Regex::new(r#"<!--\s*@component\s+["|']([^"|']*)["|']\s*-->"#).unwrap();
    static ref LAY_REG: Regex =
        Regex::new(r#"<!--\s*@layout\s+["|']([^"|']*)["|']\s*-->"#).unwrap();
    static ref SLOT_REG: Regex = Regex::new(r#"<!--\s*@slot\s*-->"#).unwrap();
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

fn validate_path(
    root: &PathBuf,
    capture: &Captures,
    file: &PathBuf,
    directive: &str,
) -> Option<PathBuf> {
    let extract = &capture[1];
    let path: PathBuf = [root, &PathBuf::from(extract)].iter().collect();

    if !path.exists() {
        eprintln!(
            "{} directive given an invalid path: '{}'",
            directive, extract
        );
        eprintln!("error originated in file '{}'", &file.to_str().unwrap());
        return None;
    }
    Some(path)
}

fn resolve_components(file: &PathBuf) -> String {
    let contents = fs::read_to_string(&file).unwrap();
    COMP_REG
        .replace_all(&contents, |capture: &Captures| {
            if let Some(path) =
                validate_path(&PathBuf::from("components/"), capture, file, "component")
            {
                resolve_components(&path)
            } else {
                String::new()
            }
        })
        .to_string()
}

fn ensure_one_capture<'a>(haystack: &'a String, reg: &Regex, file: &PathBuf, directive: &str) -> Option<Captures<'a>> {
    match reg.captures_iter(&haystack).count() {
        0 => {
            eprintln!(
                "file '{}' does not contain a {} directive",
                file.to_str().unwrap(),
                directive
            );
            return None;
        }
        1 => Some(reg.captures(&haystack).unwrap()),
        num => {
            eprintln!("files may only contain 1 {} directive.", directive);
            eprintln!("('{}' was found to have {})", file.to_str().unwrap(), num);
            return None;
        }
    }
}

fn resolve_layout(contents: String, file: &PathBuf) -> String {
    let path_capture = if let Some(cap) = ensure_one_capture(&contents, &LAY_REG, file, "layout") {
        cap
    } else {
        return contents;
    };

    if let Some(layout_path) =
        validate_path(&PathBuf::from("layouts/"), &path_capture, file, "layout")
    {
        let layout_contents = resolve_components(&layout_path);
        if ensure_one_capture(&layout_contents, &SLOT_REG, file, "slot").is_none() {
            return contents;
        }

        return SLOT_REG.replace(&layout_contents, NoExpand(&contents)).to_string();

    } else {
        return contents;
    };
}

fn main() {
    let dist = PathBuf::from("dist/");
    let _ = fs::remove_dir_all(&dist);
    for file in walk_dir(&PathBuf::from("pages/")).unwrap() {
        let contents = resolve_components(&file);
        let contents = resolve_layout(contents, &file);

        // TODO: HACK: eww
        let path: PathBuf = [&dist, file.strip_prefix("pages/").unwrap()].iter().collect();
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let mut file = File::create(path).unwrap();
        file.write_all(contents.as_bytes()).unwrap();
    }
}
