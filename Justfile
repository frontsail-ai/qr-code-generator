help:
    @just --list

[doc("Lint and format code")]
lint:
    yarn install
    yarn format:fix && yarn lint:fix && yarn type-check && yarn format:fix

[doc("Lint with no autofixing (just checking in CI)")]
lint-ci:
    yarn install
    yarn format && yarn lint && yarn type-check

[doc("Run tests")]
test *TEST_FLAGS:
    yarn run test {{ TEST_FLAGS }}

[doc("Build the project")]
build:
    yarn install
    yarn build

[doc("Run dev server")]
run:
    yarn install
    yarn dev
