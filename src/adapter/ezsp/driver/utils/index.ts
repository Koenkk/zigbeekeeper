/* istanbul ignore file */
import {randomBytes} from 'crypto';

import {EmberInitialSecurityBitmask, EmberEUI64} from '../types/named';
import {EmberInitialSecurityState, EmberKeyData} from '../types/struct';
import crc16ccitt from './crc16ccitt';

if (!Symbol.asyncIterator) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    (<any>Symbol).asyncIterator = Symbol.for('Symbol.asyncIterator');
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
function ember_security(networkKey: Buffer): EmberInitialSecurityState {
    const isc: EmberInitialSecurityState = new EmberInitialSecurityState();
    isc.bitmask =
        EmberInitialSecurityBitmask.HAVE_PRECONFIGURED_KEY |
        EmberInitialSecurityBitmask.TRUST_CENTER_GLOBAL_LINK_KEY |
        EmberInitialSecurityBitmask.HAVE_NETWORK_KEY |
        //EmberInitialSecurityBitmask.PRECONFIGURED_NETWORK_KEY_MODE |
        EmberInitialSecurityBitmask.REQUIRE_ENCRYPTED_KEY |
        EmberInitialSecurityBitmask.TRUST_CENTER_USES_HASHED_LINK_KEY;
    isc.preconfiguredKey = new EmberKeyData();
    isc.preconfiguredKey.contents = randomBytes(16);
    isc.networkKey = new EmberKeyData();
    isc.networkKey.contents = networkKey;
    isc.networkKeySequenceNumber = 0;
    isc.preconfiguredTrustCenterEui64 = new EmberEUI64([0, 0, 0, 0, 0, 0, 0, 0]);
    return isc;
}

export {crc16ccitt, ember_security};
