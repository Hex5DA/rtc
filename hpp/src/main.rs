use std::{fs::{self, File}, path::PathBuf, io::Write};

use anyhow::Result;
use lazy_static::lazy_static;
use regex::{Captures, Regex};

lazy_static! {
    static ref IMPORT_REG: Regex = Regex::new(r#"<!--\s*@component\s+["|']([^"|']*)["|']\s*-->"#).unwrap();
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

fn resolve(file: &PathBuf) -> String {
    let contents = fs::read_to_string(&file).unwrap();
    IMPORT_REG.replace_all(&contents, |capture: &Captures| {
        let extract = &capture[1];
        let path: PathBuf = [PathBuf::from("components/"), PathBuf::from(extract)].iter().collect();

        if !path.exists() {
            eprintln!("include directive given an invalid path: '{}'", extract);
            eprintln!("error originated in file '{}'", &file.to_str().unwrap());
            return String::new();
        }

        resolve(&path)
    }).to_string()
}

fn main() {
    let dist = PathBuf::from("dist/");
    let _ = fs::remove_dir_all(&dist);
    for file in walk_dir(&PathBuf::from("pages/")).unwrap() {
        let substituted = resolve(&file);
        let path: PathBuf = [&dist, &file].iter().collect();
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let mut file = File::create(path).unwrap();
        file.write_all(substituted.as_bytes()).unwrap();
    }
}
