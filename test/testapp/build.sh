#!/bin/sh
cp -r public dist
npx rtc-tern dist
npx rtc-smew
