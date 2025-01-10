# Changelog

## [3.2.2](https://github.com/Koenkk/zigbee-herdsman/compare/v3.2.1...v3.2.2) (2025-01-10)


### Bug Fixes

* ZBOSS: fixed port reconnection processing during RESET ([#1289](https://github.com/Koenkk/zigbee-herdsman/issues/1289)) ([801212f](https://github.com/Koenkk/zigbee-herdsman/commit/801212ffb1b7cd2a485ff40ad998c96f92f13041))

## [3.2.1](https://github.com/Koenkk/zigbee-herdsman/compare/v3.2.0...v3.2.1) (2025-01-02)


### Bug Fixes

* Extend genBasic cluster ([#1282](https://github.com/Koenkk/zigbee-herdsman/issues/1282)) ([4cc23fc](https://github.com/Koenkk/zigbee-herdsman/commit/4cc23fc08ed3d3e785c4d7d120b2fe07d736780c))
* Fix `owonPercentChangeInPower` ID ([#1279](https://github.com/Koenkk/zigbee-herdsman/issues/1279)) ([003b4b2](https://github.com/Koenkk/zigbee-herdsman/commit/003b4b2fb969e4cbdea88174ec4761f19d615d94))
* **ignore:** remove manuSpecificNodOnPilotWire that was moved to zigbee-herdsman-converters ([#1274](https://github.com/Koenkk/zigbee-herdsman/issues/1274)) ([1c8d886](https://github.com/Koenkk/zigbee-herdsman/commit/1c8d8864da7f89c8f18b5290150277ec61f5d873))

## [3.2.0](https://github.com/Koenkk/zigbee-herdsman/compare/v3.1.1...v3.2.0) (2024-12-28)


### Features

* Ember support for simplicity_sdk:2024.12.0 ([#1275](https://github.com/Koenkk/zigbee-herdsman/issues/1275)) ([d25695a](https://github.com/Koenkk/zigbee-herdsman/commit/d25695af728b030fba4a1367271e84d015ae36b6))

## [3.1.1](https://github.com/Koenkk/zigbee-herdsman/compare/v3.1.0...v3.1.1) (2024-12-22)


### Bug Fixes

* **ignore:** Fix dist not emitted after `clean` ([9c1a3a4](https://github.com/Koenkk/zigbee-herdsman/commit/9c1a3a4fab47a47aa8a19ee86192221eb5960f2e))

## [3.1.0](https://github.com/Koenkk/zigbee-herdsman/compare/v3.0.4...v3.1.0) (2024-12-21)


### Features

* Use Vitest for testing ([#1270](https://github.com/Koenkk/zigbee-herdsman/issues/1270)) ([47b902e](https://github.com/Koenkk/zigbee-herdsman/commit/47b902eca7a4cb4d2618b51b091fd7027fea58a0))


### Bug Fixes

* Cleanup imports/exports ([#1269](https://github.com/Koenkk/zigbee-herdsman/issues/1269)) ([6fde32f](https://github.com/Koenkk/zigbee-herdsman/commit/6fde32ff0c829f688fb77889a172ca481710e320))
* Fix Xiaomi struct parsing ([#1271](https://github.com/Koenkk/zigbee-herdsman/issues/1271)) ([248b6e9](https://github.com/Koenkk/zigbee-herdsman/commit/248b6e99ebed71e32395328abcf401934aa156f3))
* **ignore:** import using `node:` prefix for built-in ([#1268](https://github.com/Koenkk/zigbee-herdsman/issues/1268)) ([b23e10a](https://github.com/Koenkk/zigbee-herdsman/commit/b23e10a9bbf7af4a0e155067aa9b1d0d5d3a13c2))
* **ignore:** overrides ([#1267](https://github.com/Koenkk/zigbee-herdsman/issues/1267)) ([068f03a](https://github.com/Koenkk/zigbee-herdsman/commit/068f03a1d9d7f4c8e9529ac73be6a5fea3c57958))
* **ignore:** update dependencies ([#1265](https://github.com/Koenkk/zigbee-herdsman/issues/1265)) ([68597b9](https://github.com/Koenkk/zigbee-herdsman/commit/68597b922d258d7540bb214cf9e98b70b3efa0f4))
* **ignore:** update dependencies ([#1272](https://github.com/Koenkk/zigbee-herdsman/issues/1272)) ([7cd08e2](https://github.com/Koenkk/zigbee-herdsman/commit/7cd08e2aaa7657e3e2dde7338963723d52c9d38a))

## [3.0.4](https://github.com/Koenkk/zigbee-herdsman/compare/v3.0.3...v3.0.4) (2024-12-14)


### Bug Fixes

* **ignore:** update dependencies ([#1262](https://github.com/Koenkk/zigbee-herdsman/issues/1262)) ([018243e](https://github.com/Koenkk/zigbee-herdsman/commit/018243ec54d179715c6a6f5436171e446b2c2215))
* ZStack: fix request network address blocking requests ([#1256](https://github.com/Koenkk/zigbee-herdsman/issues/1256)) ([09eb767](https://github.com/Koenkk/zigbee-herdsman/commit/09eb767ddfa8dd4322a98b268e38cd728281a34d))

## [3.0.3](https://github.com/Koenkk/zigbee-herdsman/compare/v3.0.2...v3.0.3) (2024-12-13)


### Bug Fixes

* Fix tuya custom attributes types. ([#1260](https://github.com/Koenkk/zigbee-herdsman/issues/1260)) ([cba0912](https://github.com/Koenkk/zigbee-herdsman/commit/cba09120be2cfb9b1225a0278fdd0c699b129934))
* Proper extended PAN ID in `getNetworkParameters` ([#1259](https://github.com/Koenkk/zigbee-herdsman/issues/1259)) ([febca96](https://github.com/Koenkk/zigbee-herdsman/commit/febca962ffcd8880a33156064d2e4995e84862b4))

## [3.0.2](https://github.com/Koenkk/zigbee-herdsman/compare/v3.0.1...v3.0.2) (2024-12-08)


### Bug Fixes

* **ignore:** update dependencies ([#1254](https://github.com/Koenkk/zigbee-herdsman/issues/1254)) ([1d22bd2](https://github.com/Koenkk/zigbee-herdsman/commit/1d22bd29688bdfb1a301390a09c37759904e054c))
* Permit join optimisation ([#1251](https://github.com/Koenkk/zigbee-herdsman/issues/1251)) ([5dca3bc](https://github.com/Koenkk/zigbee-herdsman/commit/5dca3bcddb33f899222f5f3f27b7e1a1193b6f11))

## [3.0.1](https://github.com/Koenkk/zigbee-herdsman/compare/v3.0.0...v3.0.1) (2024-12-05)


### Bug Fixes

* Allow hostnames for tcp adapters https://github.com/Koenkk/zigbee2mqtt/issues/25062 ([e9240da](https://github.com/Koenkk/zigbee-herdsman/commit/e9240da62deb80ae7d50c8c3a61eb9a13f1da4e8))
* **ignore:** improve e9240da62deb80ae7d50c8c3a61eb9a13f1da4e8 ([5a29fda](https://github.com/Koenkk/zigbee-herdsman/commit/5a29fda0d5e7f502c3e122d0a14f75ab3d942490))

## [3.0.0](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.9...v3.0.0) (2024-12-01)


### ⚠ BREAKING CHANGES

* Fix some transmit power issues after #1139 ([#1222](https://github.com/Koenkk/zigbee-herdsman/issues/1222))
* Improved adapter discovery ([#1197](https://github.com/Koenkk/zigbee-herdsman/issues/1197))
* Improve permit join ([#1214](https://github.com/Koenkk/zigbee-herdsman/issues/1214))

### Features

* Improve permit join ([#1214](https://github.com/Koenkk/zigbee-herdsman/issues/1214)) ([818435a](https://github.com/Koenkk/zigbee-herdsman/commit/818435afcf55d7392fd71df25913427dc67eaada))
* Improved adapter discovery ([#1197](https://github.com/Koenkk/zigbee-herdsman/issues/1197)) ([1d35a14](https://github.com/Koenkk/zigbee-herdsman/commit/1d35a1435512285323b0dd0e185ffdbe23ac05b9))


### Bug Fixes

* Better support for install codes (including deconz) ([#1243](https://github.com/Koenkk/zigbee-herdsman/issues/1243)) ([9ac181c](https://github.com/Koenkk/zigbee-herdsman/commit/9ac181c8c58323b9f246bb4292aadac2fccc2ac1))
* Better support for install codes (including deconz) ([#1243](https://github.com/Koenkk/zigbee-herdsman/issues/1243)) ([b98b141](https://github.com/Koenkk/zigbee-herdsman/commit/b98b141d2ccebd207b4ef31ffa695a2be8284016))
* Fix some transmit power issues after [#1139](https://github.com/Koenkk/zigbee-herdsman/issues/1139) ([#1222](https://github.com/Koenkk/zigbee-herdsman/issues/1222)) ([c016153](https://github.com/Koenkk/zigbee-herdsman/commit/c0161535c734800478d62203d6db695a7a1f67aa))
* General cleanup ([#1231](https://github.com/Koenkk/zigbee-herdsman/issues/1231)) ([86d1a76](https://github.com/Koenkk/zigbee-herdsman/commit/86d1a76c0a3f803859e98dfd0af7e60ece60f28e))
* **ignore:** Update dependencies ([#1246](https://github.com/Koenkk/zigbee-herdsman/issues/1246)) ([bc24ecb](https://github.com/Koenkk/zigbee-herdsman/commit/bc24ecb2cf7d1dd5e78e859a3962668a950c8f89))

## [2.1.9](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.8...v2.1.9) (2024-11-18)


### Bug Fixes

* comment on Z-Stack ZDO command oddity ([#1240](https://github.com/Koenkk/zigbee-herdsman/issues/1240)) ([b54d1e8](https://github.com/Koenkk/zigbee-herdsman/commit/b54d1e8f22ef9505e95a3eb2764e44ad4c2a1757))
* Fix command responses in the scenes cluster ([#1241](https://github.com/Koenkk/zigbee-herdsman/issues/1241)) ([1d54cba](https://github.com/Koenkk/zigbee-herdsman/commit/1d54cba76de04a80fb65d647369ec0e9f53e230a))

## [2.1.8](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.7...v2.1.8) (2024-11-13)


### Bug Fixes

* Fix missing response for readReportConfig command ([#1235](https://github.com/Koenkk/zigbee-herdsman/issues/1235)) ([6b29aff](https://github.com/Koenkk/zigbee-herdsman/commit/6b29affb2470fc68bf3a83cc6c3e8a4413b7fe44))
* **ignore:** update dependencies ([#1229](https://github.com/Koenkk/zigbee-herdsman/issues/1229)) ([59c2f1b](https://github.com/Koenkk/zigbee-herdsman/commit/59c2f1b1c776667d18831bd0f55654e5577cb50b))
* **ignore:** update dependencies ([#1232](https://github.com/Koenkk/zigbee-herdsman/issues/1232)) ([bf3b0a0](https://github.com/Koenkk/zigbee-herdsman/commit/bf3b0a07584c219405de6697dfad0242baa10956))
* ZNP ZDO: skip logging payload ([#1233](https://github.com/Koenkk/zigbee-herdsman/issues/1233)) ([c8ad904](https://github.com/Koenkk/zigbee-herdsman/commit/c8ad90461afae84e7e78dae28fae173cc84cab67))

## [2.1.7](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.6...v2.1.7) (2024-10-31)


### Bug Fixes

* Remove disappeared endpoints ([#1227](https://github.com/Koenkk/zigbee-herdsman/issues/1227)) ([cc7f479](https://github.com/Koenkk/zigbee-herdsman/commit/cc7f479168c049127e22171766617f84ee959559))

## [2.1.6](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.5...v2.1.6) (2024-10-29)


### Bug Fixes

* Ember: minor cleanup ([#1223](https://github.com/Koenkk/zigbee-herdsman/issues/1223)) ([bf8b468](https://github.com/Koenkk/zigbee-herdsman/commit/bf8b4680ecf062b39dc8afb71f093332a00232f6))
* **ignore:** update dependencies ([#1225](https://github.com/Koenkk/zigbee-herdsman/issues/1225)) ([a2a9e54](https://github.com/Koenkk/zigbee-herdsman/commit/a2a9e54f31353cbb01a8336f4715f90123e3fb07))
* ZBOSS: fix ZDO bind/unbind commands for groups ([#1226](https://github.com/Koenkk/zigbee-herdsman/issues/1226)) ([f2fa9ab](https://github.com/Koenkk/zigbee-herdsman/commit/f2fa9abd97b30433fdc24c62fb41e2fc9ebb0757))

## [2.1.5](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.4...v2.1.5) (2024-10-21)


### Bug Fixes

* **ignore:** update dependencies ([#1219](https://github.com/Koenkk/zigbee-herdsman/issues/1219)) ([5f11842](https://github.com/Koenkk/zigbee-herdsman/commit/5f118426098d5bc3331db39f13fea4b52c652ebf))
* ZBOSS: Fix unhandled error on sendZclFrameToEndpointInternal in case of request execute time more than timeout. ([#1218](https://github.com/Koenkk/zigbee-herdsman/issues/1218)) ([346b3be](https://github.com/Koenkk/zigbee-herdsman/commit/346b3be6392f67d35fa36abd8cd9d52747641a88))

## [2.1.4](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.3...v2.1.4) (2024-10-18)


### Bug Fixes

* Ember: set NWK frame counter on backup restore ([#1213](https://github.com/Koenkk/zigbee-herdsman/issues/1213)) ([48a4278](https://github.com/Koenkk/zigbee-herdsman/commit/48a427876bbf26600b4343b1501e36a98201c82c))
* **ignore:** fix fdcea288e477956511bd1e07c72909599d29494d ([021d6ba](https://github.com/Koenkk/zigbee-herdsman/commit/021d6ba7e7423a811748e03cc902e1956d6c7993))
* **ignore:** fix pnpm publish ([3a8a9ff](https://github.com/Koenkk/zigbee-herdsman/commit/3a8a9ff1e234c988feefd17c04f4ae634138c445))
* **ignore:** fix pnpm publish ([ec7c799](https://github.com/Koenkk/zigbee-herdsman/commit/ec7c7999f18493142d3787ebde6e0a03172c1f83))
* **ignore:** Switch to pnpm ([#1215](https://github.com/Koenkk/zigbee-herdsman/issues/1215)) ([fdcea28](https://github.com/Koenkk/zigbee-herdsman/commit/fdcea288e477956511bd1e07c72909599d29494d))
* **ignore:** update dependencies ([#1211](https://github.com/Koenkk/zigbee-herdsman/issues/1211)) ([8485184](https://github.com/Koenkk/zigbee-herdsman/commit/8485184258f3d7cfddabfc2a62190abaf0fba101))
* **ignore:** update dependencies ([#1216](https://github.com/Koenkk/zigbee-herdsman/issues/1216)) ([deb42aa](https://github.com/Koenkk/zigbee-herdsman/commit/deb42aafdff2cc153233480ba0208aa7b37cacb7))
* Log socket errors https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/644 ([#1217](https://github.com/Koenkk/zigbee-herdsman/issues/1217)) ([96fc5e6](https://github.com/Koenkk/zigbee-herdsman/commit/96fc5e6cac2deb04d5fa3821b24cb0a2976609da))

## [2.1.3](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.2...v2.1.3) (2024-09-30)


### Bug Fixes

* Fix unable to join some devices with Conbee III ([#1207](https://github.com/Koenkk/zigbee-herdsman/issues/1207)) ([3e7bfaa](https://github.com/Koenkk/zigbee-herdsman/commit/3e7bfaa11693f1dc9e7608777e852cfbdb6ffd2b))

## [2.1.2](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.1...v2.1.2) (2024-09-29)


### Bug Fixes

* Fix crash on IEEE address request timeout ([#1209](https://github.com/Koenkk/zigbee-herdsman/issues/1209)) ([985e11a](https://github.com/Koenkk/zigbee-herdsman/commit/985e11a48eeede31558b1e0a561c40755d7e8226))
* **ignore:** update dependencies ([#1208](https://github.com/Koenkk/zigbee-herdsman/issues/1208)) ([854e5f3](https://github.com/Koenkk/zigbee-herdsman/commit/854e5f318a6cc2c1ea896f0fabc6ce627c20b79b))
* **ignore:** zigate: Workaround missing ZDO `LEAVE_RESPONSE` ([#1204](https://github.com/Koenkk/zigbee-herdsman/issues/1204)) ([5d02efe](https://github.com/Koenkk/zigbee-herdsman/commit/5d02efe44826401521b85259dde5e3ca4421e312))
* On NO_ENTRY error during unbind cleanup database ([#1206](https://github.com/Koenkk/zigbee-herdsman/issues/1206)) ([01b76ff](https://github.com/Koenkk/zigbee-herdsman/commit/01b76ff3f352ce76eb98b3cd4fa9d09c67f8563c))

## [2.1.1](https://github.com/Koenkk/zigbee-herdsman/compare/v2.1.0...v2.1.1) (2024-09-24)


### Bug Fixes

* Cleanup network address change code ([#1201](https://github.com/Koenkk/zigbee-herdsman/issues/1201)) ([d6eef4d](https://github.com/Koenkk/zigbee-herdsman/commit/d6eef4d8b6c946316fe7a914c810dc0e3b654893))
* **ignore:** zigate: Various fixes ([#1203](https://github.com/Koenkk/zigbee-herdsman/issues/1203)) ([45c0f26](https://github.com/Koenkk/zigbee-herdsman/commit/45c0f26c3b05c7c8e45403040f7fe87ff5d35afd))

## [2.1.0](https://github.com/Koenkk/zigbee-herdsman/compare/v2.0.0...v2.1.0) (2024-09-23)


### Features

* ZBOSS: group and broadcast requests ([#1200](https://github.com/Koenkk/zigbee-herdsman/issues/1200)) ([0317295](https://github.com/Koenkk/zigbee-herdsman/commit/0317295d4f1b4165575449e460930c03b7814a1f))


### Bug Fixes

* **ignore:** zigate: Fix ZDO BIND/UNBIND payload mismatch. ([#1198](https://github.com/Koenkk/zigbee-herdsman/issues/1198)) ([b007282](https://github.com/Koenkk/zigbee-herdsman/commit/b0072827349bc3b87ee3550733d7ccf7c40bfe04))

## [2.0.0](https://github.com/Koenkk/zigbee-herdsman/compare/v1.1.0...v2.0.0) (2024-09-22)


### ⚠ BREAKING CHANGES

* Standardize ZDO ([#1194](https://github.com/Koenkk/zigbee-herdsman/issues/1194))

### Features

* Standardize ZDO ([#1194](https://github.com/Koenkk/zigbee-herdsman/issues/1194)) ([9bce063](https://github.com/Koenkk/zigbee-herdsman/commit/9bce063767ec3c63f287a44dcdef60338c51b3d9))


### Bug Fixes

* **ignore:** update dependencies ([#1195](https://github.com/Koenkk/zigbee-herdsman/issues/1195)) ([3f76f1a](https://github.com/Koenkk/zigbee-herdsman/commit/3f76f1a14bcdc52af9e9793b1ce2312f4b5cb7ae))

## [1.1.0](https://github.com/Koenkk/zigbee-herdsman/compare/v1.0.1...v1.1.0) (2024-09-21)


### Features

* Prepare to move specific ZDO requests out of Adapter ([#1187](https://github.com/Koenkk/zigbee-herdsman/issues/1187)) ([d84725b](https://github.com/Koenkk/zigbee-herdsman/commit/d84725bc22abe15d5ea3215b3a961fd6d65d22ff))

## [1.0.1](https://github.com/Koenkk/zigbee-herdsman/compare/v1.0.0...v1.0.1) (2024-09-19)


### Bug Fixes

* **ignore:** Fix crash due to BigInt serialization ([#1191](https://github.com/Koenkk/zigbee-herdsman/issues/1191)) ([d760eb3](https://github.com/Koenkk/zigbee-herdsman/commit/d760eb36cdaa309898f1c504fbe291e7d9a039aa))

## [1.0.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.57.4...v1.0.0) (2024-09-17)


### ⚠ BREAKING CHANGES

* Fix always use `number` for `reportableChange` ([#1190](https://github.com/Koenkk/zigbee-herdsman/issues/1190))

### Bug Fixes

* Fix always use `number` for `reportableChange` ([#1190](https://github.com/Koenkk/zigbee-herdsman/issues/1190)) ([e30d7b7](https://github.com/Koenkk/zigbee-herdsman/commit/e30d7b760a4264ede2f15c451668769473230517))
* **ignore:** update dependencies ([#1188](https://github.com/Koenkk/zigbee-herdsman/issues/1188)) ([741b9c8](https://github.com/Koenkk/zigbee-herdsman/commit/741b9c8f7fa040e85556f176554f15abddf6ac2f))

## [0.57.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.57.3...v0.57.4) (2024-09-14)


### Bug Fixes

* Add missing response ID to `view` command ([#1181](https://github.com/Koenkk/zigbee-herdsman/issues/1181)) ([fc229cc](https://github.com/Koenkk/zigbee-herdsman/commit/fc229cc26404bdce6dacffaeb80561da06d78f36))
* Fix `Error: CommandID '159' from subsystem '5' not found` https://github.com/Koenkk/zigbee2mqtt/issues/3363 ([c77db30](https://github.com/Koenkk/zigbee-herdsman/commit/c77db3067ddabc1d047fe7e94929d6116bd3a15d))
* Fix two docs typos in device.ts ([#1182](https://github.com/Koenkk/zigbee-herdsman/issues/1182)) ([3d4b374](https://github.com/Koenkk/zigbee-herdsman/commit/3d4b3749c0780494d3142a874d6b5abb2ad5c678))
* **ignore:** Improve performance when logging is disabled ([#1178](https://github.com/Koenkk/zigbee-herdsman/issues/1178)) ([f3fc0d7](https://github.com/Koenkk/zigbee-herdsman/commit/f3fc0d7334be6701d396ae3ef556a2618a68f80e))
* **ignore:** Sync eslint settings from zhc ([#1185](https://github.com/Koenkk/zigbee-herdsman/issues/1185)) ([e2683ed](https://github.com/Koenkk/zigbee-herdsman/commit/e2683ed6586beb4963ef454f86e3cb4565f1dee6))
* **ignore:** update dependencies ([#1179](https://github.com/Koenkk/zigbee-herdsman/issues/1179)) ([b001834](https://github.com/Koenkk/zigbee-herdsman/commit/b001834e7c602c24db4b39d84b14015ad55d0223))
* Use BuffaloZdo in ZStackAdapter ([#1133](https://github.com/Koenkk/zigbee-herdsman/issues/1133)) ([4fa371d](https://github.com/Koenkk/zigbee-herdsman/commit/4fa371df704299c9987378787b8310c6b952dc86))
* ZDO spec: improve build/read logic and typing ([#1186](https://github.com/Koenkk/zigbee-herdsman/issues/1186)) ([c8cb557](https://github.com/Koenkk/zigbee-herdsman/commit/c8cb557a6bd38b90608558c8944c86c11b334d29))

## [0.57.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.57.2...v0.57.3) (2024-09-06)


### Bug Fixes

* Use `Map` for runtime Device/Group lookups. ([#1176](https://github.com/Koenkk/zigbee-herdsman/issues/1176)) ([eb96b55](https://github.com/Koenkk/zigbee-herdsman/commit/eb96b55beada9569935c39cba8e87cf17c2cb06d))

## [0.57.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.57.1...v0.57.2) (2024-09-06)


### Bug Fixes

* Fix Deconz Green power implementation ([#1175](https://github.com/Koenkk/zigbee-herdsman/issues/1175)) ([4b99609](https://github.com/Koenkk/zigbee-herdsman/commit/4b9960910e4e2587479e388870b0a83b4239285e))
* **ignore:** update dependencies ([#1171](https://github.com/Koenkk/zigbee-herdsman/issues/1171)) ([ce90134](https://github.com/Koenkk/zigbee-herdsman/commit/ce90134aea9e832565bbe404d3eb8e092a3998de))
* ZBOSS: fixed logging and uart packet handling ([#1174](https://github.com/Koenkk/zigbee-herdsman/issues/1174)) ([0e9228f](https://github.com/Koenkk/zigbee-herdsman/commit/0e9228fbe024a8ea73ddef948a8c038383d854ed))

## [0.57.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.57.0...v0.57.1) (2024-08-30)


### Bug Fixes

* **ignore:** ZBOSS: Catch error for cancel waiting ([#1168](https://github.com/Koenkk/zigbee-herdsman/issues/1168)) ([53de8d4](https://github.com/Koenkk/zigbee-herdsman/commit/53de8d4f30888f2cc2f575c8c5d8007c79f92ec0))
* Remove `heimanSpecificFormaldehydeMeasurement` in favour of `msFormaldehyde` ([#1166](https://github.com/Koenkk/zigbee-herdsman/issues/1166)) ([717f729](https://github.com/Koenkk/zigbee-herdsman/commit/717f7290047a29e17f745de57a0939a1018baa99))
* Zigate: parse all values as big endian ([#1170](https://github.com/Koenkk/zigbee-herdsman/issues/1170)) ([1a50e2e](https://github.com/Koenkk/zigbee-herdsman/commit/1a50e2e47f0b7364d32fdcb3f49531f481f95c55))

## [0.57.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.56.2...v0.57.0) (2024-08-27)


### Features

* ZBOSS adapter for nRF ZBOSS NCP ([#1165](https://github.com/Koenkk/zigbee-herdsman/issues/1165)) ([bef4655](https://github.com/Koenkk/zigbee-herdsman/commit/bef46559a93a5218a50868cd0bb1692ae2f76383))


### Bug Fixes

* **ignore:** Remove `manuSpecificInovelli` cluster ([#1161](https://github.com/Koenkk/zigbee-herdsman/issues/1161)) ([54d0dda](https://github.com/Koenkk/zigbee-herdsman/commit/54d0dda8b3c11a3b8cbe7c164dba45340f29f690))
* **ignore:** Remove `mz` depdency https://github.com/Koenkk/zigbee-herdsman/pull/1154 ([46ec9ee](https://github.com/Koenkk/zigbee-herdsman/commit/46ec9ee8f08076d08b61981ea87f55fae8b4134c))
* **ignore:** update dependencies ([#1164](https://github.com/Koenkk/zigbee-herdsman/issues/1164)) ([54421dc](https://github.com/Koenkk/zigbee-herdsman/commit/54421dca7dbb3a329ec420155d2bdafe41a88e5e))

## [0.56.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.56.1...v0.56.2) (2024-08-18)


### Bug Fixes

* **ignore:** add rimraf ([1fa9409](https://github.com/Koenkk/zigbee-herdsman/commit/1fa9409107782fe218d2d31770881d2f281c7d9e))

## [0.56.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.56.0...v0.56.1) (2024-08-18)


### Bug Fixes

* Ember: fix CCA issues in busy environments (broadcast errors) ([#1153](https://github.com/Koenkk/zigbee-herdsman/issues/1153)) ([81d828b](https://github.com/Koenkk/zigbee-herdsman/commit/81d828b9f778afd4e577519fb7f0035268dcaa40))
* Ember: fix GP proxied messages handling ([#1151](https://github.com/Koenkk/zigbee-herdsman/issues/1151)) ([748e001](https://github.com/Koenkk/zigbee-herdsman/commit/748e001485db872fa9373920085b6a6c1ed8f118))
* **ignore:** Migrate to eslint 9 ([#1154](https://github.com/Koenkk/zigbee-herdsman/issues/1154)) ([1ff1dc7](https://github.com/Koenkk/zigbee-herdsman/commit/1ff1dc77bd5637c05f2d8865cbbb850371c3a645))
* **ignore:** update dependencies ([#1155](https://github.com/Koenkk/zigbee-herdsman/issues/1155)) ([f60520f](https://github.com/Koenkk/zigbee-herdsman/commit/f60520f3ef3241083ab6ed26633aac28a431459a))

## [0.56.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.5...v0.56.0) (2024-08-16)


### Features

* Enforce TS `strict` type checking and other improvements ([#1146](https://github.com/Koenkk/zigbee-herdsman/issues/1146)) ([98e3384](https://github.com/Koenkk/zigbee-herdsman/commit/98e3384b74429d94a81c4d84938f133c4b9f6078))


### Bug Fixes

* **ignore:** update dependencies ([#1147](https://github.com/Koenkk/zigbee-herdsman/issues/1147)) ([16d5cfe](https://github.com/Koenkk/zigbee-herdsman/commit/16d5cfe058ccb20af0e0d48356b577a0d31ce64b))
* Improve bind/unbind logic ([#1144](https://github.com/Koenkk/zigbee-herdsman/issues/1144)) ([a3aeb33](https://github.com/Koenkk/zigbee-herdsman/commit/a3aeb33c7ec687acb55c5e5d3b93d0566f24a0ba))
* Support install code format with pipe delimiter ([#1150](https://github.com/Koenkk/zigbee-herdsman/issues/1150)) ([3a5b075](https://github.com/Koenkk/zigbee-herdsman/commit/3a5b075d90e0e9652e53794ba1391a4ec6c04f83))

## [0.55.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.4...v0.55.5) (2024-08-06)


### Bug Fixes

* Allow to set adapter transmit power on startup ([#1139](https://github.com/Koenkk/zigbee-herdsman/issues/1139)) ([036a2d5](https://github.com/Koenkk/zigbee-herdsman/commit/036a2d5d6b15345de448fafadec371dcf5d3c535))
* **ignore:** update dependencies ([#1140](https://github.com/Koenkk/zigbee-herdsman/issues/1140)) ([515e855](https://github.com/Koenkk/zigbee-herdsman/commit/515e855148d7f8cae0084a91775cbd838f1bf864))
* **ignore:** update dependencies ([#1142](https://github.com/Koenkk/zigbee-herdsman/issues/1142)) ([738c43e](https://github.com/Koenkk/zigbee-herdsman/commit/738c43e6d509f45f21d3adb8cede69218a9cbbb5))

## [0.55.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.3...v0.55.4) (2024-08-03)


### Bug Fixes

* call fsync before rename ([#1134](https://github.com/Koenkk/zigbee-herdsman/issues/1134)) ([1c9190a](https://github.com/Koenkk/zigbee-herdsman/commit/1c9190a373c4e878f36cc23e399add3523c616ec))
* **ignore:** update dependencies ([#1135](https://github.com/Koenkk/zigbee-herdsman/issues/1135)) ([1fd87d6](https://github.com/Koenkk/zigbee-herdsman/commit/1fd87d6a98811b1dbb4951fc6b3103ec0a6ad288))
* Move Deconz change network paramters to `start` from `getNetworkParameters` ([#1138](https://github.com/Koenkk/zigbee-herdsman/issues/1138)) ([b207c73](https://github.com/Koenkk/zigbee-herdsman/commit/b207c730dc1439ce9e8d3fcaf12ec6b2c24e9c20))

## [0.55.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.2...v0.55.3) (2024-07-26)


### Bug Fixes

* ZStack: throw errors when ZDO calls fail ([#1128](https://github.com/Koenkk/zigbee-herdsman/issues/1128)) ([e47812b](https://github.com/Koenkk/zigbee-herdsman/commit/e47812b8cac79f93aed2b35b9ceab29310302212))

## [0.55.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.1...v0.55.2) (2024-07-25)


### Bug Fixes

* **ignore:** move eslint config and plugins to devDependencies ([#1129](https://github.com/Koenkk/zigbee-herdsman/issues/1129)) ([c4e7395](https://github.com/Koenkk/zigbee-herdsman/commit/c4e7395d42cbd0deb1d21fcc0962f0fdc9feac13))
* **ignore:** Remove some unecessary string concatenations ([557ec54](https://github.com/Koenkk/zigbee-herdsman/commit/557ec54b89c1ec6f6a209726473267163bd44ee3))
* Improve loops performance ([#1130](https://github.com/Koenkk/zigbee-herdsman/issues/1130)) ([b2e9778](https://github.com/Koenkk/zigbee-herdsman/commit/b2e9778748ba3b86c2da614fc6bee5fabaad5f29))

## [0.55.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.55.0...v0.55.1) (2024-07-21)


### Bug Fixes

* **ignore:** Ember: Add tests for adapter layer ([#1126](https://github.com/Koenkk/zigbee-herdsman/issues/1126)) ([6318333](https://github.com/Koenkk/zigbee-herdsman/commit/63183339bf1a38caa8d21f9e24def2d89cec71ff))
* **ignore:** update dependencies ([#1123](https://github.com/Koenkk/zigbee-herdsman/issues/1123)) ([cb6448c](https://github.com/Koenkk/zigbee-herdsman/commit/cb6448c4aab734c995acc2cfb9d63e36a6b7f486))
* ZStack: throw error when bind/unbind fails ([#1125](https://github.com/Koenkk/zigbee-herdsman/issues/1125)) ([db2d9a5](https://github.com/Koenkk/zigbee-herdsman/commit/db2d9a5f563bdb4a741ce77c49e0fd3a686f3fd1))

## [0.55.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.54.1...v0.55.0) (2024-07-18)


### Features

* Add `serialNumber` to `genBasic` cluster ([#1117](https://github.com/Koenkk/zigbee-herdsman/issues/1117)) ([c2de0be](https://github.com/Koenkk/zigbee-herdsman/commit/c2de0bec0eb2278bf0ea30c8ecd3e17321398fad))


### Bug Fixes

* Ember: Add keys to adapter queue executors ([#1121](https://github.com/Koenkk/zigbee-herdsman/issues/1121)) ([9bec23a](https://github.com/Koenkk/zigbee-herdsman/commit/9bec23aab314261374ebdec41c94d5b25202d6f7))

## [0.54.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.54.0...v0.54.1) (2024-07-17)


### Bug Fixes

* Ember: Fix launch bootloader command ([#1118](https://github.com/Koenkk/zigbee-herdsman/issues/1118)) ([276359e](https://github.com/Koenkk/zigbee-herdsman/commit/276359e69f9957959089f17a59892c15cee6edcc))
* Fix no `checkinInterval` after restart if device has no `genPollCtl` cluster ([#1119](https://github.com/Koenkk/zigbee-herdsman/issues/1119)) ([ca1dd1f](https://github.com/Koenkk/zigbee-herdsman/commit/ca1dd1f775b1edc6a92240e3e797f2e428d213d2))

## [0.54.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.53.1...v0.54.0) (2024-07-16)


### Features

* Add `pm1Measurement` and `pm10Measurement` clusters, update `pm25Measurement` ([#1116](https://github.com/Koenkk/zigbee-herdsman/issues/1116)) ([802dfc1](https://github.com/Koenkk/zigbee-herdsman/commit/802dfc1becdd26319a296ebf2e547aad0c5af59e))
* Support channel change for z-stack ([#1110](https://github.com/Koenkk/zigbee-herdsman/issues/1110)) ([9c9b58a](https://github.com/Koenkk/zigbee-herdsman/commit/9c9b58aebb4efbc43d20ce54abdaa2320fde0ef0))


### Bug Fixes

* Add IEEE -&gt; NWK Addr translation on RX for Conbee 3 ([#1114](https://github.com/Koenkk/zigbee-herdsman/issues/1114)) ([14b7b53](https://github.com/Koenkk/zigbee-herdsman/commit/14b7b537f15f8dfbeb6b615fec55cbd2805ddff3))
* **ignore:** update dependencies ([#1113](https://github.com/Koenkk/zigbee-herdsman/issues/1113)) ([f73f65f](https://github.com/Koenkk/zigbee-herdsman/commit/f73f65fc0494555dac88a60266ed3c021e8e5bea))

## [0.53.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.53.0...v0.53.1) (2024-07-12)


### Bug Fixes

* Allow to ignore cache for device interview ([#1109](https://github.com/Koenkk/zigbee-herdsman/issues/1109)) ([3b55e54](https://github.com/Koenkk/zigbee-herdsman/commit/3b55e5469d0827ef8ab09f1f4cd08158e10cb524))

## [0.53.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.52.0...v0.53.0) (2024-07-10)


### Features

* Inovelli Adding P26 For VZM36 ([#1096](https://github.com/Koenkk/zigbee-herdsman/issues/1096)) ([4adfea3](https://github.com/Koenkk/zigbee-herdsman/commit/4adfea37dab7bd193d5fc3793da774c4e1002933))


### Bug Fixes

* Ember: Always set `TRUST_CENTER_ADDRESS_CACHE_SIZE` ([#1108](https://github.com/Koenkk/zigbee-herdsman/issues/1108)) ([72b7f55](https://github.com/Koenkk/zigbee-herdsman/commit/72b7f55a146ce17a1c59a6b41f3f6e438553f027))

## [0.52.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.51.0...v0.52.0) (2024-07-08)


### Features

* Ember: Implement requests concurrency ([#1106](https://github.com/Koenkk/zigbee-herdsman/issues/1106)) ([a737f9b](https://github.com/Koenkk/zigbee-herdsman/commit/a737f9b6caff62b3d18ecee6a9cd1836798a6121))


### Bug Fixes

* **ignore:** Implement prettier ([#1103](https://github.com/Koenkk/zigbee-herdsman/issues/1103)) ([2b2bd5b](https://github.com/Koenkk/zigbee-herdsman/commit/2b2bd5be1e372d02a73dcb257ce7a9dbf6cee9b1))
* **ignore:** update dependencies ([#1105](https://github.com/Koenkk/zigbee-herdsman/issues/1105)) ([039fd3e](https://github.com/Koenkk/zigbee-herdsman/commit/039fd3efb776232fe5491639c28977ad0f78d891))

## [0.51.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.50.1...v0.51.0) (2024-07-01)


### Features

* Ember: Support for EmberZNet v8.0.0 ([#1094](https://github.com/Koenkk/zigbee-herdsman/issues/1094)) ([c87ccd4](https://github.com/Koenkk/zigbee-herdsman/commit/c87ccd48a66b85272a409be737b9161fef8225d8))

## [0.50.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.50.0...v0.50.1) (2024-06-30)


### Bug Fixes

* Add calibration attributes for Niko 552-72301 ([#1098](https://github.com/Koenkk/zigbee-herdsman/issues/1098)) ([6ba4024](https://github.com/Koenkk/zigbee-herdsman/commit/6ba4024f24996e15961ebd501620cdd1540c678d))
* **ignore:** Cleanup develco clusters as they are now in zhc ([#1097](https://github.com/Koenkk/zigbee-herdsman/issues/1097)) ([e942d96](https://github.com/Koenkk/zigbee-herdsman/commit/e942d964411beb77c1050d7b38cb66fb9f1fefc1))
* **ignore:** Fix not awaited promise in `implicitCheckin ([#1099](https://github.com/Koenkk/zigbee-herdsman/issues/1099)) ([6d2ee88](https://github.com/Koenkk/zigbee-herdsman/commit/6d2ee88f576861d2b70b7735fcefd18b57c193e0))
* **ignore:** update dependencies ([#1091](https://github.com/Koenkk/zigbee-herdsman/issues/1091)) ([79886ac](https://github.com/Koenkk/zigbee-herdsman/commit/79886ac747568d7613d21c4948909fbd5ef832b5))
* **ignore:** update dependencies ([#1095](https://github.com/Koenkk/zigbee-herdsman/issues/1095)) ([99ee8f4](https://github.com/Koenkk/zigbee-herdsman/commit/99ee8f494d2c8d49040d8aa354772a3c16fa79c0))
* **ignore:** update dependencies ([#1100](https://github.com/Koenkk/zigbee-herdsman/issues/1100)) ([75e4f15](https://github.com/Koenkk/zigbee-herdsman/commit/75e4f150a2e11a142ca2382a03b465cedaf02515))

## [0.50.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.49.3...v0.50.0) (2024-06-14)


### Features

* Add tuyaSetMinimumBrightness command ([#1090](https://github.com/Koenkk/zigbee-herdsman/issues/1090)) ([690408f](https://github.com/Koenkk/zigbee-herdsman/commit/690408f1bd6f78c4961d9ae27fd0e7e20648b042))
* Expose all commands ([#1088](https://github.com/Koenkk/zigbee-herdsman/issues/1088)) ([6d1838a](https://github.com/Koenkk/zigbee-herdsman/commit/6d1838a1f981af7367c960c81db7465054bc4baa))


### Bug Fixes

* Ember: automatically rename/ignore unsupported backup versions ([#1085](https://github.com/Koenkk/zigbee-herdsman/issues/1085)) ([9092fe5](https://github.com/Koenkk/zigbee-herdsman/commit/9092fe588ef2698da51c802b4742d1241fbebaf9))
* Ember: workaround: auto-register unknown multicasts in coordinator ([#1089](https://github.com/Koenkk/zigbee-herdsman/issues/1089)) ([f5e82bf](https://github.com/Koenkk/zigbee-herdsman/commit/f5e82bf0e58a722e49ed38bf9dc855425016becf))
* Ezsp: log failed message delivery ([#1081](https://github.com/Koenkk/zigbee-herdsman/issues/1081)) ([12487ce](https://github.com/Koenkk/zigbee-herdsman/commit/12487ce0a43e20e84392d183d3393cdf90495a94))
* Hide network key in zigbee-herdsman logs ([#1086](https://github.com/Koenkk/zigbee-herdsman/issues/1086)) ([d06d9c5](https://github.com/Koenkk/zigbee-herdsman/commit/d06d9c5eaa13de036a833d45ccdf542c7b218f80))
* **ignore:** Move manuSpecificIkeaAirPurifier to zhc ([#1083](https://github.com/Koenkk/zigbee-herdsman/issues/1083)) ([b72481c](https://github.com/Koenkk/zigbee-herdsman/commit/b72481c0bd32e52ae1ba5277b4f20a2820042dc0))
* **ignore:** update dependencies ([#1084](https://github.com/Koenkk/zigbee-herdsman/issues/1084)) ([5ceac0b](https://github.com/Koenkk/zigbee-herdsman/commit/5ceac0b46596181dde4c98235577e11bcbae4988))

## [0.49.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.49.2...v0.49.3) (2024-06-05)


### Bug Fixes

* Ember: Handle port close event triggered with error but without port error event. ([#1080](https://github.com/Koenkk/zigbee-herdsman/issues/1080)) ([447813c](https://github.com/Koenkk/zigbee-herdsman/commit/447813c8f2540dae823b3832347563e564703647))
* **ignore:** Rename `TuYa` to `Tuya` https://github.com/Koenkk/zigbee2mqtt/discussions/22876 ([9d88b6b](https://github.com/Koenkk/zigbee-herdsman/commit/9d88b6bcb57c5a4f7b00a5996d4c316646067ce7))
* **ignore:** update dependencies ([#1079](https://github.com/Koenkk/zigbee-herdsman/issues/1079)) ([ad67f77](https://github.com/Koenkk/zigbee-herdsman/commit/ad67f772663d902b767263aa9a263bd34e29db79))
* Remove all Bosch clusters ([#1077](https://github.com/Koenkk/zigbee-herdsman/issues/1077)) ([64ac386](https://github.com/Koenkk/zigbee-herdsman/commit/64ac386dca1d2be90fb1ad1a3b7003119890e651))

## [0.49.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.49.1...v0.49.2) (2024-05-27)


### Bug Fixes

* Log `Default response to xxx failed` as `debug` https://github.com/Koenkk/zigbee2mqtt/issues/22414 ([2ce21da](https://github.com/Koenkk/zigbee-herdsman/commit/2ce21da139b6e793669f5d90487fd21a05c689ed))

## [0.49.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.49.0...v0.49.1) (2024-05-27)


### Bug Fixes

* Fix `seMetering` cluster https://github.com/Koenkk/zigbee2mqtt/issues/22720 ([a76040f](https://github.com/Koenkk/zigbee-herdsman/commit/a76040fd08b5c59d66751f8cab04b749fb484b16))
* **ignore:** update dependencies ([#1074](https://github.com/Koenkk/zigbee-herdsman/issues/1074)) ([878bb57](https://github.com/Koenkk/zigbee-herdsman/commit/878bb57051ac559e8856ee5ae6e0614fde23cdc4))

## [0.49.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.48.1...v0.49.0) (2024-05-23)


### Features

* Ember: Custom stack config support ([#1072](https://github.com/Koenkk/zigbee-herdsman/issues/1072)) ([bacf947](https://github.com/Koenkk/zigbee-herdsman/commit/bacf947192119fa4ac7d8fa44c89b95d4b9c7528))

## [0.48.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.48.0...v0.48.1) (2024-05-19)


### Bug Fixes

* Ember: revert default APS options change in [#1065](https://github.com/Koenkk/zigbee-herdsman/issues/1065) ([#1068](https://github.com/Koenkk/zigbee-herdsman/issues/1068)) ([4f8e9fb](https://github.com/Koenkk/zigbee-herdsman/commit/4f8e9fb5cdc08540740dfbf628551ad85978afb9))
* **ignore:** update dependencies ([#1067](https://github.com/Koenkk/zigbee-herdsman/issues/1067)) ([6c31940](https://github.com/Koenkk/zigbee-herdsman/commit/6c31940c8ca792d990245953f6d0930e9b4ceb50))

## [0.48.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.47.2...v0.48.0) (2024-05-18)


### Features

* Ember: change default APS options to follow silabs impl. ([#1065](https://github.com/Koenkk/zigbee-herdsman/issues/1065)) ([6408a05](https://github.com/Koenkk/zigbee-herdsman/commit/6408a05073bb0c7a1315dfa73c330e4b0a277ee8))
* Optimize adapter disconnected state ([#1066](https://github.com/Koenkk/zigbee-herdsman/issues/1066)) ([54ea6ac](https://github.com/Koenkk/zigbee-herdsman/commit/54ea6ac7fca802f0a897224fd6e5a41ef7c61de5))


### Bug Fixes

* Ember: fix some int8 read/written as uint8 ([#1062](https://github.com/Koenkk/zigbee-herdsman/issues/1062)) ([bceec88](https://github.com/Koenkk/zigbee-herdsman/commit/bceec8821845d07d9d7a6ad160995d4f9735b8a0))

## [0.47.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.47.1...v0.47.2) (2024-05-14)


### Bug Fixes

* **ignore:** improve 953a2b4f1dbaa0c558d8950e7e9e83447ac663a2 ([b192ac1](https://github.com/Koenkk/zigbee-herdsman/commit/b192ac174e11b15968979aaad8b49fce60bf9f37))

## [0.47.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.47.0...v0.47.1) (2024-05-13)


### Bug Fixes

* Fix `DatabaseEntry with ID already exists` https://github.com/Koenkk/zigbee2mqtt/issues/22584 ([953a2b4](https://github.com/Koenkk/zigbee-herdsman/commit/953a2b4f1dbaa0c558d8950e7e9e83447ac663a2))
* **ignore:** fix 953a2b4f1dbaa0c558d8950e7e9e83447ac663a2 ([b2ed451](https://github.com/Koenkk/zigbee-herdsman/commit/b2ed451d3ae7a5aeb2cf5b8d53cca52c692364dc))

## [0.47.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.6...v0.47.0) (2024-05-12)


### Features

* Zigbee specification revamp ([#1042](https://github.com/Koenkk/zigbee-herdsman/issues/1042)) ([7316247](https://github.com/Koenkk/zigbee-herdsman/commit/73162478f5e5c3d9058bfada27dfff52b9d2c612))


### Bug Fixes

* **ignore:** update dependencies ([#1056](https://github.com/Koenkk/zigbee-herdsman/issues/1056)) ([de8c862](https://github.com/Koenkk/zigbee-herdsman/commit/de8c862c494f31b7d3783175ec4695792610a352))

## [0.46.6](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.5...v0.46.6) (2024-05-09)


### Bug Fixes

* Ember: fix for some startup issues, with associated tests. ([#1053](https://github.com/Koenkk/zigbee-herdsman/issues/1053)) ([3ab71b4](https://github.com/Koenkk/zigbee-herdsman/commit/3ab71b46bffda76b430b0471b971a246ca492a1d))

## [0.46.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.4...v0.46.5) (2024-05-08)


### Bug Fixes

* Ember: fix permit join denied for single-device (zdo) ([#1052](https://github.com/Koenkk/zigbee-herdsman/issues/1052)) ([6bddc23](https://github.com/Koenkk/zigbee-herdsman/commit/6bddc234c825421e3bf259ad484c0052144c7fd0))
* Move `Received network/route error` to `info` ([#1050](https://github.com/Koenkk/zigbee-herdsman/issues/1050)) ([f36c56d](https://github.com/Koenkk/zigbee-herdsman/commit/f36c56d06dca9ee02c766d82bfde17e41cf27605))

## [0.46.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.3...v0.46.4) (2024-05-06)


### Bug Fixes

* Add `motDEtat` to `liXeePrivate` cluster https://github.com/Koenkk/zigbee2mqtt/issues/21825 ([a731e60](https://github.com/Koenkk/zigbee-herdsman/commit/a731e604991d8b47ebe86e894d2ca44954ea2109))
* Fix `Received undefined command from '0'` https://github.com/Koenkk/zigbee2mqtt/issues/22140 ([2a7ce14](https://github.com/Koenkk/zigbee-herdsman/commit/2a7ce14df8a22d833c0fc9e027b08c5680af8b0f))
* Fixes for `ember` ([#1049](https://github.com/Koenkk/zigbee-herdsman/issues/1049)) ([0d5ef04](https://github.com/Koenkk/zigbee-herdsman/commit/0d5ef04995f491b1cca5025336d7f43f3010ea81))

## [0.46.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.2...v0.46.3) (2024-05-05)


### Bug Fixes

* Add `commandMoveToHueAndSaturation` https://github.com/Koenkk/zigbee2mqtt/issues/22467 ([9caef05](https://github.com/Koenkk/zigbee-herdsman/commit/9caef0516ea546de3ce34c5852887ae426a5a2ec))

## [0.46.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.1...v0.46.2) (2024-05-05)


### Bug Fixes

* **ignore:** update dependencies ([#1046](https://github.com/Koenkk/zigbee-herdsman/issues/1046)) ([440bb5c](https://github.com/Koenkk/zigbee-herdsman/commit/440bb5c67c00bb6910f2dd021c1fb9b81e02318e))
* Move `Unknown attribute` log to debug https://github.com/Koenkk/zigbee2mqtt/issues/22396 ([70e6a9f](https://github.com/Koenkk/zigbee-herdsman/commit/70e6a9fa2f68a8d2eeb141a6b241850f58b2a580))

## [0.46.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.46.0...v0.46.1) (2024-05-04)


### Bug Fixes

* **ignore:** remove all ubisys custom cluster/attributes ([#1034](https://github.com/Koenkk/zigbee-herdsman/issues/1034)) ([0e54023](https://github.com/Koenkk/zigbee-herdsman/commit/0e5402332b5d6c19575e859057b8a1d43da28f1f))
* Move some ZiGate log statement to debug ([#1043](https://github.com/Koenkk/zigbee-herdsman/issues/1043)) ([44235eb](https://github.com/Koenkk/zigbee-herdsman/commit/44235eb67861e6f65ab23463c22042d68f5a0918))

## [0.46.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.45.0...v0.46.0) (2024-05-01)


### Features

* ZCL types revamp ([#1033](https://github.com/Koenkk/zigbee-herdsman/issues/1033)) ([f88b4d6](https://github.com/Koenkk/zigbee-herdsman/commit/f88b4d64ed6e96e52b709fa98c7110686e84180c))

## [0.45.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.44.0...v0.45.0) (2024-04-30)


### Features

* Log EZSP adapter deprecated ([#1039](https://github.com/Koenkk/zigbee-herdsman/issues/1039)) ([d55a267](https://github.com/Koenkk/zigbee-herdsman/commit/d55a267cc9c6e6f655d9a349493ccfb25d5b5832))

## [0.44.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.43.1...v0.44.0) (2024-04-28)


### Features

* Add `zclCommandBroadcast` to endpoint ([#1028](https://github.com/Koenkk/zigbee-herdsman/issues/1028)) ([ccfd299](https://github.com/Koenkk/zigbee-herdsman/commit/ccfd2994124cdb0c43656cb82559acdf23baf7d6))


### Bug Fixes

* **ignore:** Export zspec https://github.com/Koenkk/zigbee-herdsman-converters/pull/7427 ([d661d73](https://github.com/Koenkk/zigbee-herdsman/commit/d661d737b3e6668434879d7e998ab8d8541a94a9))
* **ignore:** update dependencies ([#1035](https://github.com/Koenkk/zigbee-herdsman/issues/1035)) ([7300ca4](https://github.com/Koenkk/zigbee-herdsman/commit/7300ca4fbed963c172895ed34851f91313f87867))

## [0.43.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.43.0...v0.43.1) (2024-04-25)


### Bug Fixes

* Improve `tuyaAction` parsing ([#1030](https://github.com/Koenkk/zigbee-herdsman/issues/1030)) ([7867154](https://github.com/Koenkk/zigbee-herdsman/commit/786715424e15f78b5320c96558633429a9dcd8ba))
* update msOccupancySensing definition ([#1031](https://github.com/Koenkk/zigbee-herdsman/issues/1031)) ([687527e](https://github.com/Koenkk/zigbee-herdsman/commit/687527ed37bc06ccccb30e866ee41c31b02e11e6))

## [0.43.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.5...v0.43.0) (2024-04-23)


### Features

* Support custom clusters ([#1019](https://github.com/Koenkk/zigbee-herdsman/issues/1019)) ([d845f29](https://github.com/Koenkk/zigbee-herdsman/commit/d845f299ca44ba9ffccbb06f1e85081389a3281d))

## [0.42.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.4...v0.42.5) (2024-04-21)


### Bug Fixes

* Ember: Register default bind group in coordinator mc table. ([#1026](https://github.com/Koenkk/zigbee-herdsman/issues/1026)) ([2094a08](https://github.com/Koenkk/zigbee-herdsman/commit/2094a086342f174ce3ef8ccd14154d1cfe2d44a5))

## [0.42.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.3...v0.42.4) (2024-04-21)


### Bug Fixes

* Add `flowMeterConfig` to `manuSpecificSinope` ([#1025](https://github.com/Koenkk/zigbee-herdsman/issues/1025)) ([47cd267](https://github.com/Koenkk/zigbee-herdsman/commit/47cd2677abbedd887931a4decff4749046a5ac2c))
* EZSP: fix frombuffer refactor GP ([#1023](https://github.com/Koenkk/zigbee-herdsman/issues/1023)) ([bd4f476](https://github.com/Koenkk/zigbee-herdsman/commit/bd4f476a5db756072955eebac2c83ceaec9d9743))
* **ignore:** update dependencies ([#1022](https://github.com/Koenkk/zigbee-herdsman/issues/1022)) ([181703b](https://github.com/Koenkk/zigbee-herdsman/commit/181703b8e38779ae9e93defa570810b890dd916b))

## [0.42.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.2...v0.42.3) (2024-04-18)


### Bug Fixes

* `Cannot read properties of null (reading 'asduPayload')` for Deconz adapter https://github.com/Koenkk/zigbee2mqtt/issues/22233 ([332c038](https://github.com/Koenkk/zigbee-herdsman/commit/332c0388ffc84cf645e6923debc21c54ce1d3424))

## [0.42.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.1...v0.42.2) (2024-04-15)


### Bug Fixes

* **ignore:** update dependencies ([#1017](https://github.com/Koenkk/zigbee-herdsman/issues/1017)) ([caaf520](https://github.com/Koenkk/zigbee-herdsman/commit/caaf520e31b816155aa45180929c47bbc0bf94af))
* Move `ZclFrame.fromBuffer()` out of adapter code ([#1011](https://github.com/Koenkk/zigbee-herdsman/issues/1011)) ([d4796de](https://github.com/Koenkk/zigbee-herdsman/commit/d4796de200c1541489cfb219f639b8f84c00d1fc))

## [0.42.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.42.0...v0.42.1) (2024-04-08)


### Bug Fixes

* Ember: Log ASH counters same as NCP, increase host RX pool size. ([#1014](https://github.com/Koenkk/zigbee-herdsman/issues/1014)) ([ba6da27](https://github.com/Koenkk/zigbee-herdsman/commit/ba6da27d2ea2e0f6cc6be95bb7fcf525b8671a61))
* EZSP: change logging levels ([#1013](https://github.com/Koenkk/zigbee-herdsman/issues/1013)) ([66a4b33](https://github.com/Koenkk/zigbee-herdsman/commit/66a4b3393884f948233eebe5b13d579e4233cbd5))

## [0.42.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.41.2...v0.42.0) (2024-04-07)


### Features

* Add `manuSpecificBosch11` cluster ([#1008](https://github.com/Koenkk/zigbee-herdsman/issues/1008)) ([328d0fd](https://github.com/Koenkk/zigbee-herdsman/commit/328d0fdab20ecd1284b7b77e1a5fa7b84ac16478))


### Bug Fixes

* Ember: code optimizations ([#1010](https://github.com/Koenkk/zigbee-herdsman/issues/1010)) ([cd6906c](https://github.com/Koenkk/zigbee-herdsman/commit/cd6906cfc37d74a00e7f7bd7c1745f566441dda8))
* **ignore:** update dependencies ([#1012](https://github.com/Koenkk/zigbee-herdsman/issues/1012)) ([5204162](https://github.com/Koenkk/zigbee-herdsman/commit/5204162c29a8e614637d82121f4116e9b7213ee2))

## [0.41.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.41.1...v0.41.2) (2024-04-04)


### Bug Fixes

* Ember: fixed logging levels ([#1006](https://github.com/Koenkk/zigbee-herdsman/issues/1006)) ([8a6bba8](https://github.com/Koenkk/zigbee-herdsman/commit/8a6bba895294d6c8f6f07f302961e773893c7d36))

## [0.41.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.41.0...v0.41.1) (2024-04-03)


### Bug Fixes

* Set correct manufacturerCode for Bosch ([#1003](https://github.com/Koenkk/zigbee-herdsman/issues/1003)) ([4e7e1d6](https://github.com/Koenkk/zigbee-herdsman/commit/4e7e1d6f3867921287a1e793a7427fb720340822))
* Update last seen on network address events ([#1004](https://github.com/Koenkk/zigbee-herdsman/issues/1004)) ([a45aff4](https://github.com/Koenkk/zigbee-herdsman/commit/a45aff48b31310b2b2aef5dbb9b33567dab97f1a))

## [0.41.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.40.3...v0.41.0) (2024-04-02)


### Features

* Improve logging ([#989](https://github.com/Koenkk/zigbee-herdsman/issues/989)) ([0cf7b45](https://github.com/Koenkk/zigbee-herdsman/commit/0cf7b45981cfe4840986121574c88f6437be8b15))

## [0.40.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.40.2...v0.40.3) (2024-03-31)


### Bug Fixes

* Ember: boost stack config. ([#996](https://github.com/Koenkk/zigbee-herdsman/issues/996)) ([96b2b13](https://github.com/Koenkk/zigbee-herdsman/commit/96b2b136ed7205c92e9adfe42d4d7d58847dfebb))
* **ignore:** update dependencies ([#995](https://github.com/Koenkk/zigbee-herdsman/issues/995)) ([ccfb8fd](https://github.com/Koenkk/zigbee-herdsman/commit/ccfb8fdaebe272b4f1cd1b68c397d83a15ef5878))

## [0.40.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.40.1...v0.40.2) (2024-03-29)


### Bug Fixes

* Ember: bugfixes ([#993](https://github.com/Koenkk/zigbee-herdsman/issues/993)) ([ca5fa57](https://github.com/Koenkk/zigbee-herdsman/commit/ca5fa57732d248aa6cb10b0cc54b875a659c906c))

## [0.40.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.40.0...v0.40.1) (2024-03-28)


### Bug Fixes

* **ignore:** update dependencies ([#990](https://github.com/Koenkk/zigbee-herdsman/issues/990)) ([aac0732](https://github.com/Koenkk/zigbee-herdsman/commit/aac0732de2d3f0f88df5526adc54b54c607d4917))
* ZStack: emit network address change event on concentratorIndCb ([#992](https://github.com/Koenkk/zigbee-herdsman/issues/992)) ([10e42fd](https://github.com/Koenkk/zigbee-herdsman/commit/10e42fdc0cdbc0c00360b03954101532dda02a99))

## [0.40.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.39.1...v0.40.0) (2024-03-21)


### Features

* Add `zclCommand`  ([#978](https://github.com/Koenkk/zigbee-herdsman/issues/978)) ([b688219](https://github.com/Koenkk/zigbee-herdsman/commit/b6882196fbf11d7483b05f6276637881f2241903))

## [0.39.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.39.0...v0.39.1) (2024-03-20)


### Bug Fixes

* Action command 2 for Tuya-based device ([#987](https://github.com/Koenkk/zigbee-herdsman/issues/987)) ([4135128](https://github.com/Koenkk/zigbee-herdsman/commit/41351280a89c292999d61f133aa4096c9fa40d47))
* Ember: remove `zigbeed` stack detection ([#986](https://github.com/Koenkk/zigbee-herdsman/issues/986)) ([126e926](https://github.com/Koenkk/zigbee-herdsman/commit/126e92653805ebca789af67880bb29cba68b0913))
* Remove `skipTimeResponse` in favour `customReadResponse` ([#984](https://github.com/Koenkk/zigbee-herdsman/issues/984)) ([029903d](https://github.com/Koenkk/zigbee-herdsman/commit/029903d92e46a04e390a1ba40e5ca8af956aa11a))

## [0.39.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.38.1...v0.39.0) (2024-03-19)


### Features

* Base support for channel switching without re-pairing, support it for Ember adapter ([#977](https://github.com/Koenkk/zigbee-herdsman/issues/977)) ([5693789](https://github.com/Koenkk/zigbee-herdsman/commit/56937898aa432c486f0b41682b32c31e03091903))
* Support custom read responses ([#982](https://github.com/Koenkk/zigbee-herdsman/issues/982)) ([1c196df](https://github.com/Koenkk/zigbee-herdsman/commit/1c196dfa24c1521b60a04486edb411ee0186e3d0))


### Bug Fixes

* Added non-CSA-assigned manufacturer codes currently used ([#976](https://github.com/Koenkk/zigbee-herdsman/issues/976)) ([85447fb](https://github.com/Koenkk/zigbee-herdsman/commit/85447fbc839fd5d0b42fc7708c2b61486368b3f8))
* Ember: workaround Aqara, Lumi devices not working properly ([#974](https://github.com/Koenkk/zigbee-herdsman/issues/974)) ([e3b17c2](https://github.com/Koenkk/zigbee-herdsman/commit/e3b17c2b2c833b5b80f7b4d70394fdfc627094d7))
* Fix `transactionSequenceNumber` not logged with readResponse ([#981](https://github.com/Koenkk/zigbee-herdsman/issues/981)) ([778cbad](https://github.com/Koenkk/zigbee-herdsman/commit/778cbad85912189b7df629d6f2b3dce645616138))
* **ignore:** update dependencies ([#980](https://github.com/Koenkk/zigbee-herdsman/issues/980)) ([f0b7f43](https://github.com/Koenkk/zigbee-herdsman/commit/f0b7f435f43538df338c685b5c407c896709f660))

## [0.38.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.38.0...v0.38.1) (2024-03-14)


### Bug Fixes

* Conbee: fix sporadic `UnhandledPromiseRejection` error when permit join is enabled https://github.com/Koenkk/zigbee2mqtt/issues/21696 ([fe9cab9](https://github.com/Koenkk/zigbee-herdsman/commit/fe9cab9f0a5041ba7764cbf432010c8ed63130c9))

## [0.38.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.37.0...v0.38.0) (2024-03-12)


### Features

* Add `tuyaAction` command ([#968](https://github.com/Koenkk/zigbee-herdsman/issues/968)) ([b0781d2](https://github.com/Koenkk/zigbee-herdsman/commit/b0781d2bdecdbc9fa8c68e129675722cc12d001d))


### Bug Fixes

* Ember: increase default NCP config + edge case device leave support ([#970](https://github.com/Koenkk/zigbee-herdsman/issues/970)) ([16a68ea](https://github.com/Koenkk/zigbee-herdsman/commit/16a68eacfaaa4c09eac1adb9b9564a477673f561))

## [0.37.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.36.2...v0.37.0) (2024-03-10)


### Features

* Add more attributes for manuSpecificLumi ([#966](https://github.com/Koenkk/zigbee-herdsman/issues/966)) ([68d97d8](https://github.com/Koenkk/zigbee-herdsman/commit/68d97d81ce32ca257483348bbb7d56bb45178a3c))
* Update manufaturer codes ([#963](https://github.com/Koenkk/zigbee-herdsman/issues/963)) ([641c51b](https://github.com/Koenkk/zigbee-herdsman/commit/641c51b44c4b0b363e193af01808c1081279f94a))


### Bug Fixes

* Don't allow groupID 0 ([#961](https://github.com/Koenkk/zigbee-herdsman/issues/961)) ([f5270fe](https://github.com/Koenkk/zigbee-herdsman/commit/f5270fe37c0765dfeee3bc4b027b3fd89bd76525))
* Don't emit deviceLeave event for devices that already left ([#965](https://github.com/Koenkk/zigbee-herdsman/issues/965)) ([d17319e](https://github.com/Koenkk/zigbee-herdsman/commit/d17319eb538584efdbc10f0714f385f4d182a021))
* **ignore:** update dependencies ([#967](https://github.com/Koenkk/zigbee-herdsman/issues/967)) ([e9c94c9](https://github.com/Koenkk/zigbee-herdsman/commit/e9c94c9a792c881c41fce32cf2ff808f3301d3f0))
* **ignore:** update for d17319eb538584efdbc10f0714f385f4d182a021 ([83e11d0](https://github.com/Koenkk/zigbee-herdsman/commit/83e11d07e46fc09e7a17714042fee04603a74027))
* Update Status against ZCL spec ([#964](https://github.com/Koenkk/zigbee-herdsman/issues/964)) ([b380e58](https://github.com/Koenkk/zigbee-herdsman/commit/b380e58833aaa1a4499bfe1ddc337d87e1121e61))

## [0.36.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.36.1...v0.36.2) (2024-03-08)


### Bug Fixes

* Ember: Reworked multicast registration on coordinator ([#959](https://github.com/Koenkk/zigbee-herdsman/issues/959)) ([1f9ada9](https://github.com/Koenkk/zigbee-herdsman/commit/1f9ada9ba7a45417118a27140434ceb6c8feef6e))

## [0.36.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.36.0...v0.36.1) (2024-03-07)


### Bug Fixes

* Ember: fix coordinator-only permit join ([#958](https://github.com/Koenkk/zigbee-herdsman/issues/958)) ([836f35c](https://github.com/Koenkk/zigbee-herdsman/commit/836f35c534f8f958570d3e1cf6ef8edf35bde573))
* Ember: ZDO Match logging for req/rsp ([#956](https://github.com/Koenkk/zigbee-herdsman/issues/956)) ([8ed75ff](https://github.com/Koenkk/zigbee-herdsman/commit/8ed75ffd68366ae7b183995ececc32ffd4485820))

## [0.36.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.35.3...v0.36.0) (2024-03-05)


### Features

* EZSP: Network restore from backup ([#950](https://github.com/Koenkk/zigbee-herdsman/issues/950)) ([1260ff1](https://github.com/Koenkk/zigbee-herdsman/commit/1260ff16e1c4f805480dd444f04afc4959d71a4e))


### Bug Fixes

* Ember: comments/logging cleanups. ([#952](https://github.com/Koenkk/zigbee-herdsman/issues/952)) ([52a0ff2](https://github.com/Koenkk/zigbee-herdsman/commit/52a0ff2a5e98699535c812a3cfd68ac7b0ea3b40))

## [0.35.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.35.2...v0.35.3) (2024-03-04)


### Bug Fixes

* Cleanup SerialPort async wrappers ([#949](https://github.com/Koenkk/zigbee-herdsman/issues/949)) ([cbd68df](https://github.com/Koenkk/zigbee-herdsman/commit/cbd68dfc3c195ae2158a06277497714e7252924e))
* Ember: Drastically lower default requests & callbacks processing delay & use existing setting for customization. ([#951](https://github.com/Koenkk/zigbee-herdsman/issues/951)) ([810266a](https://github.com/Koenkk/zigbee-herdsman/commit/810266a34c00c4c44d27ee51c4dfc10dd7f38649))
* **ignore:** update dependencies ([#947](https://github.com/Koenkk/zigbee-herdsman/issues/947)) ([795c944](https://github.com/Koenkk/zigbee-herdsman/commit/795c9446783e7ecd06a1d03e912e09a9e5b01228))

## [0.35.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.35.1...v0.35.2) (2024-03-02)


### Bug Fixes

* Ember: skip port re-init on reset retry ([#945](https://github.com/Koenkk/zigbee-herdsman/issues/945)) ([2a3a98b](https://github.com/Koenkk/zigbee-herdsman/commit/2a3a98beea9b3314dbb5fd976e3a6234b2bb264e))

## [0.35.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.35.0...v0.35.1) (2024-03-01)


### Bug Fixes

* Refactor names to follow convention in SchneiderSwitch cluster ([#942](https://github.com/Koenkk/zigbee-herdsman/issues/942)) ([91190b2](https://github.com/Koenkk/zigbee-herdsman/commit/91190b2c42f6738e326221f5e10348561df84864))

## [0.35.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.9...v0.35.0) (2024-02-29)


### Features

* Add manuSpecificSchneiderFanSwitchConfiguration ([#937](https://github.com/Koenkk/zigbee-herdsman/issues/937)) ([adcfd61](https://github.com/Koenkk/zigbee-herdsman/commit/adcfd61699833ac1aba9ffde62e441a11ac5e60c))

## [0.34.9](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.8...v0.34.9) (2024-02-27)


### Bug Fixes

* EZSP: fix pairing via routers not possible ([#938](https://github.com/Koenkk/zigbee-herdsman/issues/938)) ([b004cf8](https://github.com/Koenkk/zigbee-herdsman/commit/b004cf827da04eb78e7658776bd2726289797b16))

## [0.34.8](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.7...v0.34.8) (2024-02-26)


### Bug Fixes

* Ember: port init/close logic cleanup. ([#935](https://github.com/Koenkk/zigbee-herdsman/issues/935)) ([c11d356](https://github.com/Koenkk/zigbee-herdsman/commit/c11d356f618a65aa4ba1a8df35ab5d238ba20029))

## [0.34.7](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.6...v0.34.7) (2024-02-25)


### Bug Fixes

* Ember: reworked errors in ASH protocol ([#932](https://github.com/Koenkk/zigbee-herdsman/issues/932)) ([bf070cd](https://github.com/Koenkk/zigbee-herdsman/commit/bf070cd7614cbe16900d387901848e16aa62136b))

## [0.34.6](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.5...v0.34.6) (2024-02-25)


### Bug Fixes

* **ignore:** Add `DISABLE_TUYA_DEFAULT_RESPONSE` option ([c6ff266](https://github.com/Koenkk/zigbee-herdsman/commit/c6ff266f66c47d6b46745040eaaa973cd7a84407))
* **ignore:** Remove DISABLE_ASSOC_GET ([4ed739b](https://github.com/Koenkk/zigbee-herdsman/commit/4ed739bc1a45d58207607feeb06fb1f3d530a1e5))

## [0.34.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.4...v0.34.5) (2024-02-25)


### Bug Fixes

* Ember: fixed OTA response matching ([#928](https://github.com/Koenkk/zigbee-herdsman/issues/928)) ([01dbe18](https://github.com/Koenkk/zigbee-herdsman/commit/01dbe1868537e3637c16682d587f8d37871ab739))
* **ignore:** update dependencies ([#929](https://github.com/Koenkk/zigbee-herdsman/issues/929)) ([7e99154](https://github.com/Koenkk/zigbee-herdsman/commit/7e99154e0c592d4dcbe9d17bc6b87eb0952088f3))

## [0.34.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.3...v0.34.4) (2024-02-23)


### Bug Fixes

* Ember: Fix install code CRC validation. ([#926](https://github.com/Koenkk/zigbee-herdsman/issues/926)) ([79478eb](https://github.com/Koenkk/zigbee-herdsman/commit/79478ebbeee8190c4b7ff1541a9ab29a0965227a))

## [0.34.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.2...v0.34.3) (2024-02-22)


### Bug Fixes

* Ember: improve errors & checks + GreenPower support ([#924](https://github.com/Koenkk/zigbee-herdsman/issues/924)) ([9aa1aa6](https://github.com/Koenkk/zigbee-herdsman/commit/9aa1aa6bf10ebbbeae3016edcc5bfeb8699c87cb))

## [0.34.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.1...v0.34.2) (2024-02-19)


### Bug Fixes

* EZSP adapter fixes ([#921](https://github.com/Koenkk/zigbee-herdsman/issues/921)) ([6bb05c7](https://github.com/Koenkk/zigbee-herdsman/commit/6bb05c7a098812600df1b74c93142852962639f4))

## [0.34.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.34.0...v0.34.1) (2024-02-18)


### Bug Fixes

* **ignore:** temp fix for broken test ([4e6ee7a](https://github.com/Koenkk/zigbee-herdsman/commit/4e6ee7af191e32f48e3a4be501ab683c9b685b4c))

## [0.34.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.9...v0.34.0) (2024-02-18)


### Features

* Add new `ember` adapter implementation, targeting EZSP 13 and above ([#918](https://github.com/Koenkk/zigbee-herdsman/issues/918)) ([c36d051](https://github.com/Koenkk/zigbee-herdsman/commit/c36d051e0a0e20654ff716b17cde783e5b3a4989))


### Bug Fixes

* EZSP: Some refactoring of UART level and packet processing. ([#916](https://github.com/Koenkk/zigbee-herdsman/issues/916)) ([e397e38](https://github.com/Koenkk/zigbee-herdsman/commit/e397e38849ff937acbf0aef9da69fa51ac3f0f7b))
* **ignore:** update dependencies ([#917](https://github.com/Koenkk/zigbee-herdsman/issues/917)) ([e164b9c](https://github.com/Koenkk/zigbee-herdsman/commit/e164b9ce0b28fb95d67a1d9f2df06c057568cfc2))

## [0.33.9](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.8...v0.33.9) (2024-02-13)


### Bug Fixes

* Add 2 new attributes to manuSpecificSinope ([#912](https://github.com/Koenkk/zigbee-herdsman/issues/912)) ([3325997](https://github.com/Koenkk/zigbee-herdsman/commit/3325997da3afa94c2dd500b808c1261ba0a8abf8))
* Add more attributes to clipsalWiserSwitchConfigurationClusterServer ([#915](https://github.com/Koenkk/zigbee-herdsman/issues/915)) ([472bce9](https://github.com/Koenkk/zigbee-herdsman/commit/472bce952e7db1d4b29ffbec0ab536bbc2462198))
* **ignore:** update dependencies ([#914](https://github.com/Koenkk/zigbee-herdsman/issues/914)) ([fc19b3d](https://github.com/Koenkk/zigbee-herdsman/commit/fc19b3dc8250184645528cd312fd8de5d390d237))
* Revert Deconz changes of https://github.com/Koenkk/zigbee-herdsman/pull/859 in an attempt to fix https://github.com/Koenkk/zigbee2mqtt/issues/21162 ([818f2cc](https://github.com/Koenkk/zigbee-herdsman/commit/818f2cc4c28af2a57a615b0ec9ac84bfb98e7d1c))

## [0.33.8](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.7...v0.33.8) (2024-02-04)


### Bug Fixes

* **ignore:** update dependencies ([#908](https://github.com/Koenkk/zigbee-herdsman/issues/908)) ([43f6ab7](https://github.com/Koenkk/zigbee-herdsman/commit/43f6ab7338ceceaee1dc8c6a4f6a1919e3bcbfd2))
* Remove manufaturer code from StelproOutdoorTemp https://github.com/Koenkk/zigbee2mqtt/issues/21152 ([18af8be](https://github.com/Koenkk/zigbee-herdsman/commit/18af8beeff91911784a3c0aca12c0efa225a6adb))

## [0.33.7](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.6...v0.33.7) (2024-02-02)


### Bug Fixes

* **ignore:** fix 5c242c87f31878ea6297441655beb839834bcfc7 ([b733c80](https://github.com/Koenkk/zigbee-herdsman/commit/b733c80de0b2a8d5702ab56480d2d2d0fe1033b8))

## [0.33.6](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.5...v0.33.6) (2024-02-02)


### Bug Fixes

* **ignore:** Add `boschOutdoorSiren` command ([#900](https://github.com/Koenkk/zigbee-herdsman/issues/900)) ([5bb789a](https://github.com/Koenkk/zigbee-herdsman/commit/5bb789a635b973d08a063066364addcb11dc6aee))
* **ignore:** Allow to disable assoc get ([5c242c8](https://github.com/Koenkk/zigbee-herdsman/commit/5c242c87f31878ea6297441655beb839834bcfc7))

## [0.33.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.4...v0.33.5) (2024-01-30)


### Bug Fixes

* EZSP: Enable software flow control only if RTS/CTS not enabled. ([#897](https://github.com/Koenkk/zigbee-herdsman/issues/897)) ([a0f2ce9](https://github.com/Koenkk/zigbee-herdsman/commit/a0f2ce97ddf1d71b7d404741e0881fb0ba5dac68))
* **ignore:** Replace aqaraOpple cluster name with manuSpecificLumi ([#892](https://github.com/Koenkk/zigbee-herdsman/issues/892)) ([c887b15](https://github.com/Koenkk/zigbee-herdsman/commit/c887b15ba23a46aee765b383ebc946b8e8401365))

## [0.33.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.3...v0.33.4) (2024-01-29)


### Bug Fixes

* EZSP: cleaned up awaits ([#894](https://github.com/Koenkk/zigbee-herdsman/issues/894)) ([d2d27d7](https://github.com/Koenkk/zigbee-herdsman/commit/d2d27d73b01babc8bc3d9db7edbae9ee9604c6c6))

## [0.33.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.2...v0.33.3) (2024-01-28)


### Bug Fixes

* Remove IKEA specific pm25 measuredValue attribute ([#890](https://github.com/Koenkk/zigbee-herdsman/issues/890)) ([e8387ff](https://github.com/Koenkk/zigbee-herdsman/commit/e8387fff9a3e3297511656318a1737e296ca2f03))
* Some more backup support for EZSP 13+ ([#888](https://github.com/Koenkk/zigbee-herdsman/issues/888)) ([9b6c04b](https://github.com/Koenkk/zigbee-herdsman/commit/9b6c04b2a3cb77ab309e6e87a96ea155894b36c0))

## [0.33.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.1...v0.33.2) (2024-01-24)


### Bug Fixes

* EZSP: Fix socket error handling & serial/socket reset/close logic ([#886](https://github.com/Koenkk/zigbee-herdsman/issues/886)) ([43b02ee](https://github.com/Koenkk/zigbee-herdsman/commit/43b02eeca3fbfb6cc55f17cf6f27a2483c3c3d86))

## [0.33.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.33.0...v0.33.1) (2024-01-23)


### Bug Fixes

* EZSP: Added base for `incomingNetworkStatusHandler` ([#883](https://github.com/Koenkk/zigbee-herdsman/issues/883)) ([0b16f1b](https://github.com/Koenkk/zigbee-herdsman/commit/0b16f1ba1ed441c65c65ec6165158de054107ffc))
* EZSP: Cleanup asserts & fix unsupported configs. ([#885](https://github.com/Koenkk/zigbee-herdsman/issues/885)) ([2a2b3d0](https://github.com/Koenkk/zigbee-herdsman/commit/2a2b3d06a52e1abef66791764e42fdd424d75886))

## [0.33.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.7...v0.33.0) (2024-01-21)


### Features

* **ignore:** Update Inovelli cluster definition with new parameters for updated VZM35 firmware ([#881](https://github.com/Koenkk/zigbee-herdsman/issues/881)) ([3c69f6b](https://github.com/Koenkk/zigbee-herdsman/commit/3c69f6bdbf61077d357063ee6e4a1b9f840cb562))


### Bug Fixes

* **ignore:** update dependencies ([#882](https://github.com/Koenkk/zigbee-herdsman/issues/882)) ([78aa3e8](https://github.com/Koenkk/zigbee-herdsman/commit/78aa3e8c0086e82d0df360b10f0031a0b0b0f99a))
* Remove deprecated `options.sendWhen` ([#879](https://github.com/Koenkk/zigbee-herdsman/issues/879)) ([2d3a5d1](https://github.com/Koenkk/zigbee-herdsman/commit/2d3a5d1d25f45360e253946d26f4e8b95ea75e26))

## [0.32.7](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.6...v0.32.7) (2024-01-19)


### Bug Fixes

* Fix invalid GP frame crashing EZSP adapter https://github.com/Koenkk/zigbee2mqtt/issues/20838 ([f7ef707](https://github.com/Koenkk/zigbee-herdsman/commit/f7ef70768264f495ce7f45782130c9f9103c659a))

## [0.32.6](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.5...v0.32.6) (2024-01-16)


### Bug Fixes

* Fix debug logging ([#876](https://github.com/Koenkk/zigbee-herdsman/issues/876)) ([99bc922](https://github.com/Koenkk/zigbee-herdsman/commit/99bc922b88524009521a7c8f3a8af88b37e3c702))

## [0.32.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.4...v0.32.5) (2024-01-15)


### Bug Fixes

* Fixes & general cleanup in EZSP codebase ([#874](https://github.com/Koenkk/zigbee-herdsman/issues/874)) ([39bc90a](https://github.com/Koenkk/zigbee-herdsman/commit/39bc90a580aec8f5715fde5806827bb17409167a))

## [0.32.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.3...v0.32.4) (2024-01-13)


### Bug Fixes

* EZSP: Implemented several attempts to send a request in case of problems ([#871](https://github.com/Koenkk/zigbee-herdsman/issues/871)) ([41a4543](https://github.com/Koenkk/zigbee-herdsman/commit/41a45432b0c261487c548ccdfac03fcaecfa51e1))
* **ignore:** update dependencies ([#873](https://github.com/Koenkk/zigbee-herdsman/issues/873)) ([f794563](https://github.com/Koenkk/zigbee-herdsman/commit/f79456385ce3ab6c63c96d093ac170afe0948a19))
* Improve EZSP connect logic ([#869](https://github.com/Koenkk/zigbee-herdsman/issues/869)) ([a02a8e1](https://github.com/Koenkk/zigbee-herdsman/commit/a02a8e1efb4395b116be5bf14e79393eeca6627e))

## [0.32.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.2...v0.32.3) (2024-01-11)


### Bug Fixes

* Add setter for checkinInterval ([#867](https://github.com/Koenkk/zigbee-herdsman/issues/867)) ([87c0c50](https://github.com/Koenkk/zigbee-herdsman/commit/87c0c5020ea1db00d476e9a59b0475ea51f479d5))

## [0.32.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.1...v0.32.2) (2024-01-10)


### Bug Fixes

* Add bosch smoke alarm II ssiasZone command ([#861](https://github.com/Koenkk/zigbee-herdsman/issues/861)) ([48680fa](https://github.com/Koenkk/zigbee-herdsman/commit/48680fa0b24be74eb03fc314093a016d6deac1e6))
* Add OWON PC321 Power factor attributes ([#864](https://github.com/Koenkk/zigbee-herdsman/issues/864)) ([0d60b75](https://github.com/Koenkk/zigbee-herdsman/commit/0d60b75a482fc8d8d7b1c9cce188adb14640787b))

## [0.32.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.32.0...v0.32.1) (2024-01-09)


### Bug Fixes

* Improve request queue behavior [#6](https://github.com/Koenkk/zigbee-herdsman/issues/6) ([#860](https://github.com/Koenkk/zigbee-herdsman/issues/860)) ([746fafb](https://github.com/Koenkk/zigbee-herdsman/commit/746fafbea9f28829feba300a9de9f1261c2c1e36))
* Improve serialport code consistency across adapters ([#859](https://github.com/Koenkk/zigbee-herdsman/issues/859)) ([0d636fc](https://github.com/Koenkk/zigbee-herdsman/commit/0d636fc299444777ece86a337707570cc5e48cc7))

## [0.32.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.31.0...v0.32.0) (2024-01-08)


### Features

* Support EZSP 13 (gecko 4.4.0, ncp 7.4.0.0) ([#858](https://github.com/Koenkk/zigbee-herdsman/issues/858)) ([460910c](https://github.com/Koenkk/zigbee-herdsman/commit/460910c2a6528d37b181ef51c74bd6dfa964a591))

## [0.31.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.30.0...v0.31.0) (2024-01-07)


### Features

* Use cluster definition manufacturerCode when available ([#848](https://github.com/Koenkk/zigbee-herdsman/issues/848)) ([3b51b0b](https://github.com/Koenkk/zigbee-herdsman/commit/3b51b0b3ffe4471e4de505ddebd665014acf2cd9))


### Bug Fixes

* Catch more unhandled promise rejections for EZSP adapter ([#853](https://github.com/Koenkk/zigbee-herdsman/issues/853)) ([33fa223](https://github.com/Koenkk/zigbee-herdsman/commit/33fa223e19dfbd4094c3179dd70bd3499359bd29))
* **ignore:** update dependencies ([#855](https://github.com/Koenkk/zigbee-herdsman/issues/855)) ([618d522](https://github.com/Koenkk/zigbee-herdsman/commit/618d5223a575ddea4415a63ebb3deff92eef4070))

## [0.30.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.29.1...v0.30.0) (2024-01-01)


### Features

* Add manuSpecificBosch10 Cluster for BMCT-SLZ ([#849](https://github.com/Koenkk/zigbee-herdsman/issues/849)) ([7dcead9](https://github.com/Koenkk/zigbee-herdsman/commit/7dcead952d455c39f3274451fd74d361858c485d))


### Bug Fixes

* **ignore:** update dependencies ([#850](https://github.com/Koenkk/zigbee-herdsman/issues/850)) ([9048750](https://github.com/Koenkk/zigbee-herdsman/commit/9048750f7ba861396994d22f6e569fe8189fe0c6))

## [0.29.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.29.0...v0.29.1) (2023-12-27)


### Bug Fixes

* **ignore:** Revert module to commonjs ([7d14fff](https://github.com/Koenkk/zigbee-herdsman/commit/7d14fff1e45f7ccd99369fe606c57563b641e06c))

## [0.29.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.28.0...v0.29.0) (2023-12-27)


### Features

* **ignore:** Add Amazon Work With All Hubs cluster ([#839](https://github.com/Koenkk/zigbee-herdsman/issues/839)) ([854fd12](https://github.com/Koenkk/zigbee-herdsman/commit/854fd12c08ea9dea97e4a05d2de22ef5419a7dfe))


### Bug Fixes

* Add breezemode to Inovelli Cluster ([#842](https://github.com/Koenkk/zigbee-herdsman/issues/842)) ([64273b7](https://github.com/Koenkk/zigbee-herdsman/commit/64273b755122ea76120a446717a579cab0118aa2))
* Fix EZSP initialisation check ([#841](https://github.com/Koenkk/zigbee-herdsman/issues/841)) ([93cc97f](https://github.com/Koenkk/zigbee-herdsman/commit/93cc97f3f0591ac0bbbbbad6b76ae10e6cefb9a8))
* Fix wrong manufacturer code when configuring reporting for manufacturer specific attribute ([#844](https://github.com/Koenkk/zigbee-herdsman/issues/844)) ([9951d44](https://github.com/Koenkk/zigbee-herdsman/commit/9951d44af24023ea339e159e6f86c942543b8546))
* **ignore:** update dependencies ([#845](https://github.com/Koenkk/zigbee-herdsman/issues/845)) ([9d122f3](https://github.com/Koenkk/zigbee-herdsman/commit/9d122f3a531f6487f4e7f3b737ebf70549ded5c0))
* **ignore:** Update tsconfig and fix 599b3e96afe9ace3cb0231ff069fc3ff70e43b2e ([c4f9bf4](https://github.com/Koenkk/zigbee-herdsman/commit/c4f9bf4ae5385ede9718ed09066e2450222d5aef))

## [0.28.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.27.1...v0.28.0) (2023-12-23)


### Features

* **ignore:** Add valve calibration command for Bosch BTH-RA ([#836](https://github.com/Koenkk/zigbee-herdsman/issues/836)) ([7a9b0fb](https://github.com/Koenkk/zigbee-herdsman/commit/7a9b0fb9eb481be8a0598c8b26bd561007c8480b))
* **ignore:** zcl: update ubisys hvacThermostat custom attributes ([#835](https://github.com/Koenkk/zigbee-herdsman/issues/835)) ([ef198ee](https://github.com/Koenkk/zigbee-herdsman/commit/ef198ee48ec953180075eabadd8c5d7bc79ce69f))


### Bug Fixes

* **ignore:** update dependencies ([#838](https://github.com/Koenkk/zigbee-herdsman/issues/838)) ([d1a72b9](https://github.com/Koenkk/zigbee-herdsman/commit/d1a72b932ecf4208112c8c35d73c6ff0e7b8c48b))

## [0.27.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.27.0...v0.27.1) (2023-12-17)


### Bug Fixes

* **ignore:** Remove zigate %h formatter ([28b0821](https://github.com/Koenkk/zigbee-herdsman/commit/28b0821299ec40363f738412f72b45b598c61c35))

## [0.27.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.26.1...v0.27.0) (2023-12-17)


### Features

* **ignore:** add displayUnit and airQuality attributes to aqaraOpple cluster ([#829](https://github.com/Koenkk/zigbee-herdsman/issues/829)) ([65ef3db](https://github.com/Koenkk/zigbee-herdsman/commit/65ef3dbb763d79f61d10e80b18b99c3a0e423f2a))


### Bug Fixes

* Fix devices disappearing with zStack adapter when rejoining the network ([#830](https://github.com/Koenkk/zigbee-herdsman/issues/830)) ([fe8ebb7](https://github.com/Koenkk/zigbee-herdsman/commit/fe8ebb78f47f03d1506fdedba34821e1c8c7e5d8))

## [0.26.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.26.0...v0.26.1) (2023-12-10)


### Bug Fixes

* Extend `manuSpecificInovelli` cluster ([#824](https://github.com/Koenkk/zigbee-herdsman/issues/824)) ([435ed7a](https://github.com/Koenkk/zigbee-herdsman/commit/435ed7a5a0f1e45fbc4ecbc3882772e5d10ed2a9))
* **ignore:** Cleanup request queue ([#826](https://github.com/Koenkk/zigbee-herdsman/issues/826)) ([db1545b](https://github.com/Koenkk/zigbee-herdsman/commit/db1545b1170bf74c3fa9624807e233e863b844b1))

## [0.26.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.25.3...v0.26.0) (2023-12-07)


### Features

* Add `manuSpecificBosch9` cluster ([#820](https://github.com/Koenkk/zigbee-herdsman/issues/820)) ([4915931](https://github.com/Koenkk/zigbee-herdsman/commit/4915931097fc482b44af37c7fd55e854ae68f938))

## [0.25.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.25.2...v0.25.3) (2023-12-04)


### Bug Fixes

* Add `action6` to `tradfriButton` cluster https://github.com/Koenkk/zigbee2mqtt/discussions/20003 ([54adbb3](https://github.com/Koenkk/zigbee-herdsman/commit/54adbb3a7b89112b5ce22f2f6ac8fda04e728eec))
* Improve request queue behaviour ([#817](https://github.com/Koenkk/zigbee-herdsman/issues/817)) ([1051d9d](https://github.com/Koenkk/zigbee-herdsman/commit/1051d9dd31364d9cccc2d011f9eac5a1642728db))

## [0.25.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.25.1...v0.25.2) (2023-12-03)


### Bug Fixes

* Fix duplicate configured reportings https://github.com/Koenkk/zigbee2mqtt/issues/19317 ([59c1bbe](https://github.com/Koenkk/zigbee-herdsman/commit/59c1bbe2d090403c0443f97d4fba3e644b1121f3))
* **ignore:** update dependencies ([#815](https://github.com/Koenkk/zigbee-herdsman/issues/815)) ([e346986](https://github.com/Koenkk/zigbee-herdsman/commit/e3469860de19cd9b3e34be0c7374db3bba88146d))

## [0.25.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.25.0...v0.25.1) (2023-12-02)


### Bug Fixes

* Rename manuSpecificNodOnFilPilote to manuSpecificNodOnPilotWire ([#812](https://github.com/Koenkk/zigbee-herdsman/issues/812)) ([9f5aabc](https://github.com/Koenkk/zigbee-herdsman/commit/9f5aabc909770ea29102338eb29c51354ce0001a))

## [0.25.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.24.0...v0.25.0) (2023-11-30)


### Features

* Add `tradfriButton` cluster https://github.com/Koenkk/zigbee-herdsman-converters/pull/6574 ([6e454d8](https://github.com/Koenkk/zigbee-herdsman/commit/6e454d86823d5c0c47c454a71a96f1062e4f077c))

## [0.24.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.23.0...v0.24.0) (2023-11-30)


### Features

* Add tunnel cluter ([#806](https://github.com/Koenkk/zigbee-herdsman/issues/806)) ([e4d8cbe](https://github.com/Koenkk/zigbee-herdsman/commit/e4d8cbec7500e060af8d93b2361fcff3431e0237))


### Bug Fixes

* Fix some types ([#810](https://github.com/Koenkk/zigbee-herdsman/issues/810)) ([694a1fc](https://github.com/Koenkk/zigbee-herdsman/commit/694a1fc6bb164408535fa10a2e6a3894d3dd2ef6))
* **ignore:** update dependencies ([#805](https://github.com/Koenkk/zigbee-herdsman/issues/805)) ([6449923](https://github.com/Koenkk/zigbee-herdsman/commit/6449923babdcdd3190ab3d1c6455c3df32266a76))
* **ignore:** update dependencies ([#809](https://github.com/Koenkk/zigbee-herdsman/issues/809)) ([71f3eca](https://github.com/Koenkk/zigbee-herdsman/commit/71f3eca6cf332386103abb1241da6e8fd6e6aaac))

## [0.23.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.22.1...v0.23.0) (2023-11-13)


### Features

* Add `manuSpecificProfalux1` cluster ([#800](https://github.com/Koenkk/zigbee-herdsman/issues/800)) ([7347212](https://github.com/Koenkk/zigbee-herdsman/commit/7347212660904b41c6038f74776c3499599c6f22))


### Bug Fixes

* Fix some manufacturer specific attribute names being wrong ([#797](https://github.com/Koenkk/zigbee-herdsman/issues/797)) ([285e9ac](https://github.com/Koenkk/zigbee-herdsman/commit/285e9ac36d761747a95cc328d41ad4145518a89b))
* **ignore:** update dependencies ([#798](https://github.com/Koenkk/zigbee-herdsman/issues/798)) ([5c0666a](https://github.com/Koenkk/zigbee-herdsman/commit/5c0666a22a9b84165c57bfff93d4025903294c1a))

## [0.22.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.22.0...v0.22.1) (2023-11-06)


### Bug Fixes

* Fix typo, change to `commission` ([#793](https://github.com/Koenkk/zigbee-herdsman/issues/793)) ([e423928](https://github.com/Koenkk/zigbee-herdsman/commit/e423928c8131f935695d4eafe0b3ffa0ffc0003b))
* **ignore:** update dependencies ([#792](https://github.com/Koenkk/zigbee-herdsman/issues/792)) ([cb252c1](https://github.com/Koenkk/zigbee-herdsman/commit/cb252c1f739c2ddc1e75a6248fb8fa910d2fb0cf))

## [0.22.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.21.0...v0.22.0) (2023-11-03)


### Features

* **ignore:** Add NodOn Manuf Code and Manufacturer Cluster ([#790](https://github.com/Koenkk/zigbee-herdsman/issues/790)) ([fd5bf6c](https://github.com/Koenkk/zigbee-herdsman/commit/fd5bf6c4ebb91181f3c75b5cb2d699a2dc349453))


### Bug Fixes

* Fix wrong attribute names when device manufacturer ID is missing from message ([#787](https://github.com/Koenkk/zigbee-herdsman/issues/787)) ([d8e4b5b](https://github.com/Koenkk/zigbee-herdsman/commit/d8e4b5bac01478b54f43190e775cb14f72c17b43))

## [0.21.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.20.0...v0.21.0) (2023-10-25)


### Features

* **add:** New Legrand NLLV specific attributes ([#784](https://github.com/Koenkk/zigbee-herdsman/issues/784)) ([e9acbab](https://github.com/Koenkk/zigbee-herdsman/commit/e9acbab047e528e6a128d6557edebbc463f7e3c9))


### Bug Fixes

* **ignore:** update dependencies ([#782](https://github.com/Koenkk/zigbee-herdsman/issues/782)) ([10e5e00](https://github.com/Koenkk/zigbee-herdsman/commit/10e5e00da2e215318f8ccf5fcd6f0bcb76ce2d2f))
* Remove manufacturer code for Elko attributes ([#786](https://github.com/Koenkk/zigbee-herdsman/issues/786)) ([1b46aac](https://github.com/Koenkk/zigbee-herdsman/commit/1b46aac19f6c9bf91a28e7d19cd9db1b8285ad9c))

## [0.20.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.19.2...v0.20.0) (2023-10-16)


### Features

* add Inovelli VZM35 cluster parameters ([#780](https://github.com/Koenkk/zigbee-herdsman/issues/780)) ([5b854d1](https://github.com/Koenkk/zigbee-herdsman/commit/5b854d1f404fcc42c2249b961ddde7fa652074bb))
* **ignore:** Enable incremental TSC builds ([#774](https://github.com/Koenkk/zigbee-herdsman/issues/774)) ([764ab21](https://github.com/Koenkk/zigbee-herdsman/commit/764ab215bc561988cdca838954d6656396d6a223))


### Bug Fixes

* **ignore:** update dependencies ([#779](https://github.com/Koenkk/zigbee-herdsman/issues/779)) ([1abb4aa](https://github.com/Koenkk/zigbee-herdsman/commit/1abb4aa62ad81982ca3ea58f809a38d576a5277e))

## [0.19.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.19.1...v0.19.2) (2023-10-12)


### Bug Fixes

* Add queue for EZSP adapter ([#771](https://github.com/Koenkk/zigbee-herdsman/issues/771)) ([04b5ebd](https://github.com/Koenkk/zigbee-herdsman/commit/04b5ebd800d3284295cdaa755279d36088b23ce4))

## [0.19.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.19.0...v0.19.1) (2023-10-07)


### Bug Fixes

* **ignore:** Export ZclHeader type https://github.com/Koenkk/zigbee2mqtt/issues/19129 ([69fb9f1](https://github.com/Koenkk/zigbee-herdsman/commit/69fb9f10fce4ab58a2add71dc43da4250cfe3479))
* **ignore:** update dependencies ([#767](https://github.com/Koenkk/zigbee-herdsman/issues/767)) ([5507880](https://github.com/Koenkk/zigbee-herdsman/commit/5507880d332af8a36ffa1548ad44efc15b6f70a6))
* **ignore:** update dependencies ([#769](https://github.com/Koenkk/zigbee-herdsman/issues/769)) ([cb5dd54](https://github.com/Koenkk/zigbee-herdsman/commit/cb5dd54382359c3fbf73339fef5b72f2319a898c))

## [0.19.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.7...v0.19.0) (2023-09-17)


### Features

* Support mdns discovery for all adapter instead of just zstack ([#763](https://github.com/Koenkk/zigbee-herdsman/issues/763)) ([1a3edaf](https://github.com/Koenkk/zigbee-herdsman/commit/1a3edaf6b23618b2d1bc34ff9f74595162e430ea))


### Bug Fixes

* **ignore:** update dependencies ([#761](https://github.com/Koenkk/zigbee-herdsman/issues/761)) ([ec114df](https://github.com/Koenkk/zigbee-herdsman/commit/ec114df1f8f41a12e1913b58e0fb90ac9db3d547))

## [0.18.7](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.6...v0.18.7) (2023-09-04)


### Bug Fixes

* Expose `commandMcuVersionResponse` https://github.com/Koenkk/zigbee2mqtt/issues/17008 ([a75c8ef](https://github.com/Koenkk/zigbee-herdsman/commit/a75c8ef162078ba5b28417c01b29319c95c58aad))
* **ignore:** update dependencies ([#758](https://github.com/Koenkk/zigbee-herdsman/issues/758)) ([cafc26e](https://github.com/Koenkk/zigbee-herdsman/commit/cafc26e5410e9d38490ae11111c78ad6b153db1f))

## [0.18.6](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.5...v0.18.6) (2023-09-02)


### Bug Fixes

* Fix incorrect configured reporting cluster returned when cluster is manufacturer specific ([#756](https://github.com/Koenkk/zigbee-herdsman/issues/756)) ([09515bb](https://github.com/Koenkk/zigbee-herdsman/commit/09515bbe45fda9ad5d97792fbd31cc0f8f99c50e))

## [0.18.5](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.4...v0.18.5) (2023-09-01)


### Bug Fixes

* **ignore:** revert bff9d4d0d269dee199781777678a391b8e467569 ([#755](https://github.com/Koenkk/zigbee-herdsman/issues/755)) ([baaf235](https://github.com/Koenkk/zigbee-herdsman/commit/baaf235d97d0eca137674781fb60c2a88d7c6811))
* **ignore:** update dependencies ([#753](https://github.com/Koenkk/zigbee-herdsman/issues/753)) ([bd4e1c3](https://github.com/Koenkk/zigbee-herdsman/commit/bd4e1c3aacfe1d6fb5712fb16d7cccf11a78f747))

## [0.18.4](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.3...v0.18.4) (2023-08-25)


### Bug Fixes

* Fix adding backup missing devices to backup https://github.com/Koenkk/zigbee2mqtt/issues/18718 ([63cca97](https://github.com/Koenkk/zigbee-herdsman/commit/63cca97c6e33c4b786cccbfb7c71509952c8d0df))

## [0.18.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.2...v0.18.3) (2023-08-24)


### Bug Fixes

* Emit disconnect event when Zigate unplugged ([#749](https://github.com/Koenkk/zigbee-herdsman/issues/749)) ([79f3e38](https://github.com/Koenkk/zigbee-herdsman/commit/79f3e385ed5968d733d19695074432688784ee5f))
* Fix backup devices missing logging https://github.com/Koenkk/zigbee2mqtt/discussions/18706 ([9856d83](https://github.com/Koenkk/zigbee-herdsman/commit/9856d831ee39e4a942417132bea04fa9f2c1d4f9))
* Fix incorrect configured reporting cluster returned when cluster is manufacturer specific ([#748](https://github.com/Koenkk/zigbee-herdsman/issues/748)) ([bff9d4d](https://github.com/Koenkk/zigbee-herdsman/commit/bff9d4d0d269dee199781777678a391b8e467569))

## [0.18.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.1...v0.18.2) (2023-08-17)


### Bug Fixes

* Don't remove devices with linkkey from backup if they are still present in the database ([#746](https://github.com/Koenkk/zigbee-herdsman/issues/746)) ([3226a87](https://github.com/Koenkk/zigbee-herdsman/commit/3226a879a8ff9bdc0a9deb16bd55327e096c0849))

## [0.18.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.18.0...v0.18.1) (2023-08-15)


### Bug Fixes

* Fix some commands failing due to policy. https://github.com/Koenkk/zigbee2mqtt/issues/18382 ([#744](https://github.com/Koenkk/zigbee-herdsman/issues/744)) ([0e4b1cc](https://github.com/Koenkk/zigbee-herdsman/commit/0e4b1ccc35db7a3d8102dd99e5f24a5838086b3d))

## [0.18.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.17.3...v0.18.0) (2023-08-13)


### Features

* Support coordinator check ([#742](https://github.com/Koenkk/zigbee-herdsman/issues/742)) ([cb679f3](https://github.com/Koenkk/zigbee-herdsman/commit/cb679f3c64c7f411b4d22364bb363d69471db20a))

## [0.17.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.17.2...v0.17.3) (2023-08-08)


### Bug Fixes

* **ignore:** update dependencies ([#737](https://github.com/Koenkk/zigbee-herdsman/issues/737)) ([f5ccf1d](https://github.com/Koenkk/zigbee-herdsman/commit/f5ccf1d03a413e634b2deff94f0d907b9657cce1))

## [0.17.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.17.1...v0.17.2) (2023-07-11)


### Bug Fixes

* Fix incorrect bind cluster shown when cluster is manufacturer specific https://github.com/Koenkk/zigbee2mqtt/issues/10740 ([14cc282](https://github.com/Koenkk/zigbee-herdsman/commit/14cc28268a519c4147d805897ea16c9e6bdd874f))

## [0.17.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.17.0...v0.17.1) (2023-07-06)


### Bug Fixes

* Fix ping for devices which have genBasic on non first endpoint. https://github.com/Koenkk/zigbee2mqtt/issues/18121 ([9fbff6c](https://github.com/Koenkk/zigbee-herdsman/commit/9fbff6c7bbc63f0b43dac9f138d81bf4370aa31d))

## [0.17.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.16.0...v0.17.0) (2023-07-06)


### Features

* Support 16 bytes install codes for EZSP adapter ([#730](https://github.com/Koenkk/zigbee-herdsman/issues/730)) ([5ac2b71](https://github.com/Koenkk/zigbee-herdsman/commit/5ac2b713385724eaccabb765f0d6ddea650a7a9a))

## [0.16.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.15.3...v0.16.0) (2023-06-26)


### Features

* Remove EZSP queue to improve message throughput  ([#727](https://github.com/Koenkk/zigbee-herdsman/issues/727)) ([95c8795](https://github.com/Koenkk/zigbee-herdsman/commit/95c879586659c4dec891bbca852d4b53b8f1a1c2))

## [0.15.3](https://github.com/Koenkk/zigbee-herdsman/compare/v0.15.2...v0.15.3) (2023-06-25)


### Bug Fixes

* **ignore:** Fix Events.MessagePayload type. https://github.com/Koenkk/zigbee2mqtt/issues/18096 ([f662c7e](https://github.com/Koenkk/zigbee-herdsman/commit/f662c7eb75e2bd1a3b8ed180fe85574574ec9b0b))
* **ignore:** update dependencies ([#724](https://github.com/Koenkk/zigbee-herdsman/issues/724)) ([ffabf63](https://github.com/Koenkk/zigbee-herdsman/commit/ffabf63a1bb48f8b57788aa5a61cfb7749cd7d37))
* Set correct direction for default response. https://github.com/Koenkk/zigbee2mqtt/issues/18096 ([#726](https://github.com/Koenkk/zigbee-herdsman/issues/726)) ([abbdda4](https://github.com/Koenkk/zigbee-herdsman/commit/abbdda4508d35c675500675cf7aad8f56e66f697))

## [0.15.2](https://github.com/Koenkk/zigbee-herdsman/compare/v0.15.1...v0.15.2) (2023-06-22)


### Bug Fixes

* **ignore:** Fix EZSP group binding ([#722](https://github.com/Koenkk/zigbee-herdsman/issues/722)) ([7993e57](https://github.com/Koenkk/zigbee-herdsman/commit/7993e573f8f512db3c18f8e9def796feddc1b1d1))

## [0.15.1](https://github.com/Koenkk/zigbee-herdsman/compare/v0.15.0...v0.15.1) (2023-06-21)


### Bug Fixes

* Fix EZSP group binding ([#721](https://github.com/Koenkk/zigbee-herdsman/issues/721)) ([2977e42](https://github.com/Koenkk/zigbee-herdsman/commit/2977e4275b0e3cfab63c0976a492fe6a9161aeed))
* **ignore:** update dependencies ([#719](https://github.com/Koenkk/zigbee-herdsman/issues/719)) ([b8a1d71](https://github.com/Koenkk/zigbee-herdsman/commit/b8a1d713c7edd57e361a28e7f7d75dfe2a1bdd80))

## [0.15.0](https://github.com/Koenkk/zigbee-herdsman/compare/v0.14.117...v0.15.0) (2023-06-08)


### Features

* Improve request queue behavior ([#718](https://github.com/Koenkk/zigbee-herdsman/issues/718)) ([68cfe55](https://github.com/Koenkk/zigbee-herdsman/commit/68cfe554b7ca1d7d422f3392e915eeb916865f56))


### Bug Fixes

* **ignore:** update dependencies ([#715](https://github.com/Koenkk/zigbee-herdsman/issues/715)) ([d243577](https://github.com/Koenkk/zigbee-herdsman/commit/d243577c6a53d3adbb48672911883c56e782c6c2))

## [0.14.117](https://github.com/Koenkk/zigbee-herdsman/compare/v0.14.116...v0.14.117) (2023-05-23)


### Bug Fixes

* ci.yml ([f964ba1](https://github.com/Koenkk/zigbee-herdsman/commit/f964ba1743dbc184c84d923594a2894c54b0a059))

## [0.14.116](https://github.com/Koenkk/zigbee-herdsman/compare/v0.14.115...v0.14.116) (2023-05-23)


### Bug Fixes

* typo ([f9e4bf7](https://github.com/Koenkk/zigbee-herdsman/commit/f9e4bf704a254256a040f2ea09f16b9d2ebe3f09))
