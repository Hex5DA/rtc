#!/bin/zsh

mkdir dist
cp index.html dist/
cp -r public dist
npx rtc-tern dist
