help:
    @just --list

[doc("Lint and format code")]
lint:
    vp install
    vp check --fix

[doc("Lint with no autofixing (just checking in CI)")]
lint-ci:
    vp install
    vp check

[doc("Validate the Claude plugin manifests (needs the claude CLI)")]
validate-plugin:
    claude plugin validate . --strict

[doc("Run tests (core unit tests + web e2e)")]
test *TEST_FLAGS:
    vp run -r test {{ TEST_FLAGS }}

[doc("Build the project")]
build:
    vp install
    vp run web#build

[doc("Run dev server")]
run:
    vp install
    vp run web#dev
