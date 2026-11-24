# Changelog

## [0.3.0](https://github.com/keonikaku/release-pipeline/compare/v0.2.0...v0.3.0) (2026-11-24)


### Features

* verify the live site serves the deployed build's bytes ([#21](https://github.com/keonikaku/release-pipeline/issues/21)) ([49c01fc](https://github.com/keonikaku/release-pipeline/commit/49c01fc3b734e6df8593b7702919bbc5d1b9840e))


### Documentation

* record deploy on release as observed ([#18](https://github.com/keonikaku/release-pipeline/issues/18)) ([045019d](https://github.com/keonikaku/release-pipeline/commit/045019d0750dbab498d6aa606c8c36d9117ced61))
* record the first observed run of the live bytes check ([#22](https://github.com/keonikaku/release-pipeline/issues/22)) ([dbada63](https://github.com/keonikaku/release-pipeline/commit/dbada636064b8ee74ceb54f5b30b0f4e23151770))
* record the rollback drill as observed ([#20](https://github.com/keonikaku/release-pipeline/issues/20)) ([6704c7e](https://github.com/keonikaku/release-pipeline/commit/6704c7eb87af2fbc0def0cdb773df180da7da4e3))

## [0.2.0](https://github.com/keonikaku/release-pipeline/compare/v0.1.0...v0.2.0) (2026-11-23)


### Features

* deploy a release when it is published ([#16](https://github.com/keonikaku/release-pipeline/issues/16)) ([6074278](https://github.com/keonikaku/release-pipeline/commit/60742788c43f00607c1ae687081d6df29cd1417e))
* deploy a release's stored build to GitHub Pages ([#12](https://github.com/keonikaku/release-pipeline/issues/12)) ([fb5f848](https://github.com/keonikaku/release-pipeline/commit/fb5f848970f8f429dfd0ffc81f23cc4573d12b06))
* name the deploy approver in the backout record ([#14](https://github.com/keonikaku/release-pipeline/issues/14)) ([9ba9603](https://github.com/keonikaku/release-pipeline/commit/9ba960314c95b1816b1eb820d9c82d0f52595567))
* smoke the live site after each deploy ([#13](https://github.com/keonikaku/release-pipeline/issues/13)) ([38503d2](https://github.com/keonikaku/release-pipeline/commit/38503d2d2eac6ba33764a4ac188053f9a313388e))


### Documentation

* record the deploy approval gate as observed ([#15](https://github.com/keonikaku/release-pipeline/issues/15)) ([e48e5b0](https://github.com/keonikaku/release-pipeline/commit/e48e5b04e78e5249b4681c4731fdb5c391079afd))
* record the first release as observed ([#10](https://github.com/keonikaku/release-pipeline/issues/10)) ([751ea40](https://github.com/keonikaku/release-pipeline/commit/751ea406f41fc5e050bf15427aec227a3d2f32a4))

## 0.1.0 (2026-11-21)


### Features

* add the pull request gate set and the repository rules ([#1](https://github.com/keonikaku/release-pipeline/issues/1)) ([20b6f10](https://github.com/keonikaku/release-pipeline/commit/20b6f1039768e21110146733b10e821381ff2dc2))
* cut releases from a release pull request with release-please ([#4](https://github.com/keonikaku/release-pipeline/issues/4)) ([5c0cfa6](https://github.com/keonikaku/release-pipeline/commit/5c0cfa6361c03a91db98da1aa854585cb5f45b5f))


### Pipeline

* exclude the release-please manifest from Biome ([#7](https://github.com/keonikaku/release-pipeline/issues/7)) ([e66b51a](https://github.com/keonikaku/release-pipeline/commit/e66b51a70c677285b28a04aff8351ff926721054))
