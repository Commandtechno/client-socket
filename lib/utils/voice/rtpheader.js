const MaxNumbers = require('../constants').MaxNumbers;

class RTPHeader {
	constructor(options) {
		options = options || {};

		Object.defineProperty(this, 'buffer', {value: options.buffer || Buffer.alloc(12)});

		if (!options.buffer && options.version === undefined) {
			options.version = 2;
		}

		if (options.version !== undefined) {
			this.setVersion(options.version);
		}

		if (options.marker !== undefined) {
			this.setVersion(options.marker);
		}

		if (options.payloadType !== undefined) {
			this.setPayloadType(options.payloadType);
		}

		if (options.ssrc !== undefined) {
			this.setSSRC(options.ssrc);
		}

		if (options.randomize) {
			this.randomizeSequence();
			this.randomizeTimestamp();
		}
	}

	get length() {
		return this.buffer.length;
	}

	get valid() {
		return RTPHeader.valid(this.buffer);
	}

	get firstByte() {
		return this.buffer.readUIntBE(0, 1);
	}

	get secondByte() {
		return this.buffer.readUIntBE(1, 1);
	}

	get version() {
		return this.firstByte >> 6;
	}

	get padding() {
		return (this.firstByte >> 5) & 1;
	}

	get extension() {
		return (this.firstByte >> 4) & 1;
	}

	get csrcCount() {
		return this.firstByte & 0x0F;
	}

	get marker() {
		return this.secondByte >> 7;
	}

	get payloadType() {
		return this.secondByte & 0x7F;
	}

	/* header[2, 3] = sequence*/
	get sequence() {
		return this.buffer.readUIntBE(2, 2);
	}
	/* header[4, 5, 6, 7] = timestamp*/
	get timestamp() {
		return this.buffer.readUIntBE(4, 4);
	}
	/* header[8, 9, 10, 11] = ssrc*/
	get ssrc() {
		return this.buffer.readUIntBE(8, 4);
	}

	randomizeSequence() {
		this.setSequence(Math.round(Math.random() * MaxNumbers.UINT16));
	}

	randomizeTimestamp() {
		this.setTimestamp(Math.round(Math.random() * MaxNumbers.UINT32));
	}

	randomizeNonce() {
		this.setNonce(Math.round(Math.random() * MaxNumbers.UINT32));
	}


	setVersion(version) {
		this.buffer.writeUIntBE((version << 6 | this.padding << 5 | this.extension << 4 | this.csrcCount), 0, 1);
	}

	setPadding(padding) {
		this.buffer.writeUIntBE((this.version << 6 | !!padding << 5 | this.extension << 4 | this.csrcCount), 0, 1);
	}

	setExtension(extension) {
		this.buffer.writeUIntBE((this.version << 6 | this.padding << 5 | !!extension << 4 | this.csrcCount), 0, 1);
	}

	setCSRCCount(csrcCount) {
		this.buffer.writeUIntBE((this.version << 6 | this.padding << 5 | this.extension << 4 | csrcCount), 0, 1);
	}

	setMarker(marker) {
		this.buffer.writeUIntBE((!!marker << 7 | this.payloadType), 1, 1);
	}

	setPayloadType(payloadType) {
		this.buffer.writeUIntBE((this.marker << 7 | payloadType), 1, 1);
	}
	
	setSequence(sequence, increment) {
		if (!Number.isInteger(sequence)) {
			sequence = 1;
			increment = true;
		}

		sequence = ((increment) ? (this.sequence + sequence) : sequence) % MaxNumbers.UINT16;
		this.buffer.writeUIntBE(sequence, 2, 2);
	}

	setTimestamp(timestamp, increment) {
		if (!Number.isInteger(timestamp)) {
			timestamp = Date.now();
			increment = false;
		}

		timestamp = ((increment) ? (this.timestamp + timestamp) : timestamp) % MaxNumbers.UINT32;
		this.buffer.writeUIntBE(timestamp, 4, 4);
	}

	setSSRC(ssrc) {
		if (!Number.isInteger(ssrc)) {throw new Error('SSRC must be an integer!');}
		if (ssrc > MaxNumbers.UINT32) {throw new Error(`SSRC is over ${MaxNumbers.UINT32}`);}
		
        this.buffer.writeUIntBE(ssrc, 8, 4);
	}

	setPayload(payload, replace) {
		if (replace) {
			this.payload = payload;
		} else {
			this.payload.fill(0);
			payload.copy(this.payload);
		}
	}

	setNonce(nonce, increment) {
		if (Buffer.isBuffer(nonce)) {
			if (!this.nonce) {
				this.nonce = nonce;
			} else {
				this.nonce.fill(0);
				nonce.copy(this.nonce);
			}
		} else {
			if (!this.nonce) {
				this.nonce = Buffer.alloc(24);
				this.randomizeNonce();
			}
			if (!Number.isInteger(nonce)) {
				nonce = 1;
				increment = true;
			}
			nonce = ((increment) ? (this.nonceNumber + nonce) : nonce) % MaxNumbers.UINT32;
			this.nonce.writeUIntBE(nonce, 0, 4);
		}
	}

	reset() {
		const firstByte = this.firstByte;
		const secondByte = this.secondByte;

		this.buffer.fill(0);
		this.buffer.writeUIntBE(firstByte, 0, 1);
		this.buffer.writeUIntBE(secondByte, 1, 1);

		if (this.payload) {
			this.payload.fill(0);
		}

		this.randomizeSequence();
		this.randomizeTimestamp();
	}

	copy(target, targetStart, sourceStart, sourceEnd) {
		return this.buffer.copy(target, targetStart, sourceStart, sourceEnd);
	}
}

RTPHeader.valid = function(packet) {
	return ((packet.readUIntBE(0, 1) >> 6) === 2);
}

module.exports = RTPHeader;