chris
  6 months ago
Polkadot Websocket API Calls
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b000000000000000000000000000000000  b0000f2052a010bff4f39278c04  10c9834fee
//0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040010c9834fee
(edited)
23 replies
chris
  6 months ago
The missing parts are the length of the following parameters
Adds a length prefix to the input value
Example:
      
import { compactAddLength } from '@polkadot/util';

console.log(compactAddLength(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))); // Uint8Array([4 << 2, 0xde, 0xad, 0xbe, 0xef])
chris
  6 months ago
Although that doesn't really make sense as the thing following 00 should be zero length ... :thinking_face:
George Oastler
  6 months ago
@chris
 how were you collecting this info? attempting to replicate
chris
  6 months ago
Wireshark and rpc calls made when deploying the contract
chris
  6 months ago
I think I'd got past this compact length issue
chris
  6 months ago
Will need to check later
George Oastler
  6 months ago
sounds good, lmk, no rush. Got any docs on the structure of the hex here?
George Oastler
  6 months ago
https://github.com/polkadot-js/api/blob/b21cc0ae0641e10a8569aef6107b6c1701929704/packages/types/src/interfaces/contracts/definitions.ts#L44

definitions.ts
    ContractCallRequest: {
<https://github.com/polkadot-js/api|polkadot-js/api>polkadot-js/api | Added by GitHub
George Oastler
  6 months ago
so using the above definition, I've managed to break down this contract call on my pc into:

// 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18000000000000000000000000000000000107c036d4431e1366666666666666a600100a7ff7cd

// calling acc: d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d
// contract acc: 4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18
// balance: 00000000000000
// gas: 000000000000
// optional storageDepositLimit: 00
// ?: 00000107c036d4431e1366666666666666a600100a7ff7cd
unsure what the last part is exactly, as the fn I'm calling takes no params :joy: I wonder if there's further fields we're not aware of yet, something to do with ink perhaps? or maybe it's the selector?
just checked, the selector is 0x0a7ff7cd in the abi. That seems to be the end of that last part, so that's something :sweat_smile:
image.png
 
image.png


George Oastler
  5 months ago
@chris
 did you work out what that rogue 10 value was in the end?
George Oastler
  5 months ago
was from a while back
chris
  5 months ago
i.e. the message just sent?
George Oastler
  5 months ago
it was when we were trying to decode the hex, e.g. I have
//  0x
// d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27
// d4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18 
// 000000000000000000000000000000000107c036d4431e1366666666666666a600 10 0a7ff7cd
first two lines are contract + caller, the third line is the gas etc, then the selector. I've been debugging the fields in the hex and have worked out all of them except the end. I get to the 10 then selector, but I can't work out what the 10 is for. It's not an Option because that would be 01 or 00 . It could be the compact mode for the selector, but when I've done this manually I get 11 for the compact mode
George Oastler
  5 months ago
just to reinforce this, compact mode 10 can handle numbers up to 1073741823. The selector's hex as a number is
     3455549194, which is larger, hence the mode gets bumped up to the largest compact mode 11
chris
  5 months ago
Let me just check
George Oastler
  5 months ago
or I could have the fields out of line
George Oastler
  5 months ago
or it's an endian-ness thing
George Oastler
  5 months ago
scratch that, everything is little endian unless custom
chris
  5 months ago
I've used the compactAddLength PJS function for the inputData (selector+args), not the subshape compact. Maybe that made a difference (edited) 
chris
  5 months ago
It gives the 10 prefix
origin 0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487e
dest 0xc652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b
valueU8a 0x00000000000000000000000000000000
StorageDepositLimit 0x00
gasLimit 0x010b0000f2052a010bff4f39278c04
Input data 0x10c9834fee  <------here
chris
  5 months ago
c9834fee is the selector for getDappStakeDefault (edited) 
George Oastler
  5 months ago
hmmm interesting, might be a scale-ts thing
chris
  5 months ago
Are you adding arguments or just a selector?


## Get fn
call:
```
0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d3aeb237955fa19fb4806732ffcb0cd621b2961778078f7ee239ce974fb80f5f6000000000000000000000000000000000107c036d4431e1366666666666666a600102f865bd9
```

broken up:
```

d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d <-- alice
3aeb237955fa19fb4806732ffcb0cd621b2961778078f7ee239ce974fb80f5f6 <-- contract
00000000000000000000000000000000 <-- value u128
0107c036d4431e1366666666666666a6 gas
00 storage deposit limit (optional, 00 === not present)
10 <-- length of input byte[] to ink. Compact encoded. 0x10 === 0b00010000, 2 LSB is 00 meaning single byte mode. Upper 6 bits are 0b000100 which is 4 in LE. Makes sense, since holds only the selector
2f865bd9 <-- selector, the 4 bytes
... <-- args in byte[] format (not present here as no args given)
```

## Get fn with dummy args (a: u8, b: u8)
```
0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc000000000000000000000000000000000107c036d4431e1366666666666666a600188ebff2db0304
```

```
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d <-- alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
00000000000000000000000000000000 value
0107c036d4431e1366666666666666a6 gas // is this -1 for no gas limit?
00 storage deposit limit (optional, 00 === not present)
18 length as compact single byte mode. 18 === 00011000, lsb is 00 so single byte mode, upper 6 bits are 000110 which is 6 in LE. Makes sense since selector is 4 byte + 2x 1 byte args
8ebff2db selector, 4 bytes
03 a, 1 byte
04 b, 1 bytes
```

result
```
0x2e5cb15da1ab5a8e205feaaa010001000000000000000000000000000000000000000000000800010134000000000000004248ed43551702000000010000000408d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d15f73fbb00000000000000000000000000000100000008022bffc814de534601ee3b679cb98b69277be3e41f1e7beaf6d63beb3fa762bc028016cc023b0000000000000000000000d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d042bffc814de534601ee3b679cb98b69277be3e41f1e7beaf6d63beb3fa762bc020001000000000308c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc000001000000040008c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc00ca9a3b0000000000000000000000000000010000000402d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc00ca9a3b0000000000000000000000000000010000000800d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000808d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc80c4d26c170000000000000000000000082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000808d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc4033c348170000000000000000000000082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000407d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27df65886000000000000000000000000000000010000000600d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d1f9eb9ba000000000000000000000000000000000000000000000000000000000000010000000000039404bcba098e00000002080601d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc08f28e41e4d60e624b9b594f8e0f9cc8752676f1ee060cc3b9fefe45022f8faf07390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c
```
```
2e5cb15da1ab5a8e205feaaa010001000000000000000000000000000000000000000000000800010134000000000000004248ed43551702000000010000000408
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
15f73fbb00000000000000000000000000000100000008022bffc814de534601ee3b679cb98b69277be3e41f1e7beaf6d63beb3fa762bc028016cc023b0000000000000000000000
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
042bffc814de534601ee3b679cb98b69277be3e41f1e7beaf6d63beb3fa762bc0200010000000003
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
0000010000000400
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
00ca9a3b0000000000000000000000000000010000000402
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
00ca9a3b0000000000000000000000000000010000000800
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000808
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
80c4d26c170000000000000000000000082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000808
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
4033c348170000000000000000000000082e3fb4c297a84c5cebc0e78257d213d0927ccc7596044c6ba013dd05522aacba390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c00010000000407
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
f65886000000000000000000000000000000010000000600
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
1f9eb9ba000000000000000000000000000000000000000000000000000000000000010000000000039404bcba098e00000002080601
d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d alice
08c979f73b2da9362151031ae649b9da22fd4d26d315cc3ea9525bd11648f6bc contract
08f28e41e4d60e624b9b594f8e0f9cc8752676f1ee060cc3b9fefe45022f8faf07390812758c88a2dccf0b87334d2801cc4c2e11057ed6abdb8a57c728645a1c0c
```
