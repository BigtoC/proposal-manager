#!/bin/bash
(cd .. && cargo run --bin schema)

ts-codegen generate \
  --schema ../schema \
  --out src/__generated__ \
  --plugin client \
  --plugin message-composer \
  --name proposal_manager \
  --no-bundle