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

[doc("Run tests")]
test *TEST_FLAGS:
    vp exec playwright test {{ TEST_FLAGS }}

[doc("Build the project")]
build:
    vp install
    vp build

[doc("Run dev server")]
run:
    vp install
    vp dev
