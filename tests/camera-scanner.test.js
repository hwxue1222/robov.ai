const test = require('node:test');
const assert = require('node:assert/strict');
const { CameraScanner } = require('../camera-scanner');

function fixture(getUserMedia, onResult=()=>{}) {
  const video = { pause() {}, async play() {}, readyState:2, videoWidth:512, videoHeight:512 };
  const canvas = { getContext:()=>({drawImage() {},getImageData:()=>({})}) };
  return new CameraScanner({video,canvas,decode:()=> 'test.token',onResult,onError:()=>{},mediaDevices:{getUserMedia}});
}

test('camera tracks are stopped when cancelled while permission is pending', async () => {
  let resolve, stopped=0;
  const stream = {getTracks:()=>[{stop:()=>stopped++}]};
  const scanner = fixture(()=>new Promise(r=>{resolve=r;}));
  const starting = scanner.start(); scanner.stop(); resolve(stream);
  assert.equal(await starting,false); assert.equal(stopped,1); assert.equal(scanner.video.srcObject,null);
});

test('successful QR detection closes camera before delivering token', async () => {
  let stopped=0;
  const stream = {getTracks:()=>[{stop:()=>stopped++}]};
  let result;
  const done = new Promise(resolve=>{result=resolve;});
  const scanner = fixture(async()=>stream, token=>{assert.equal(stopped,1);result(token);});
  assert.equal(await scanner.start(),true);
  assert.equal(await done,'test.token'); assert.equal(scanner.stream,null); assert.equal(scanner.timer,null);
});

test('permission denial propagates without starting a video stream', async () => {
  const error = Object.assign(new Error('denied'),{name:'NotAllowedError'});
  const scanner = fixture(async()=>{throw error;});
  await assert.rejects(scanner.start(),{name:'NotAllowedError'});
  assert.equal(scanner.stream,null); assert.equal(scanner.timer,null);
});
