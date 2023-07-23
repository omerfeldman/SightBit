// import React, { useEffect, useState, useRef } from 'react';
// import axios from 'axios';
// import io from 'socket.io-client';


// const unquoteCredential = (v) => (
//   JSON.parse(`"${v}"`)
// );

// const linkToIceServers = (links) => (
//   (links !== null) ? links.split(', ').map((link) => {
//     const m = link.match(/^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i);
//     const ret = {
//       urls: [m[1]],
//     };

//     if (m[3] !== undefined) {
//       ret.username = unquoteCredential(m[3]);
//       ret.credential = unquoteCredential(m[4]);
//       ret.credentialType = "password";
//     }

//     return ret;
//   }) : []
// );

// const parseOffer = (offer) => {
//   const ret = {
//     iceUfrag: '',
//     icePwd: '',
//     medias: [],
//   };

//   for (const line of offer.split('\r\n')) {
//     if (line.startsWith('m=')) {
//       ret.medias.push(line.slice('m='.length));
//     } else if (ret.iceUfrag === '' && line.startsWith('a=ice-ufrag:')) {
//       ret.iceUfrag = line.slice('a=ice-ufrag:'.length);
//     } else if (ret.icePwd === '' && line.startsWith('a=ice-pwd:')) {
//       ret.icePwd = line.slice('a=ice-pwd:'.length);
//     }
//   }

//   return ret;
// };

// const generateSdpFragment = (offerData, candidates) => {
//   const candidatesByMedia = {};
//   for (const candidate of candidates) {
//     const mid = candidate.sdpMLineIndex;
//     if (candidatesByMedia[mid] === undefined) {
//       candidatesByMedia[mid] = [];
//     }
//     candidatesByMedia[mid].push(candidate);
//   }

//   let frag = 'a=ice-ufrag:' + offerData.iceUfrag + '\r\n'
//     + 'a=ice-pwd:' + offerData.icePwd + '\r\n';

//   let mid = 0;

//   for (const media of offerData.medias) {
//     if (candidatesByMedia[mid] !== undefined) {
//       frag += 'm=' + media + '\r\n'
//         + 'a=mid:' + mid + '\r\n';

//       for (const candidate of candidatesByMedia[mid]) {
//         frag += 'a=' + candidate.candidate + '\r\n';
//       }
//     }
//     mid++;
//   }

//   return frag;
// }
// const socket = io('http://localhost:5000', {
//   auth: {
//     username: 'user1',
//     password: '9iKscFQzEwiE49hdEtrR49tg'
//   }
// });

// function LiveStream() {

//   const [pc, setPc] = useState(null);
//   const [restartTimeout, setRestartTimeout] = useState(null);
//   const [eTag, setETag] = useState('');
//   const [queuedCandidates, setQueuedCandidates] = useState([]);
//   const videoRef = useRef(null);
//   const socketRef = useRef(null);
//   const [offerData, setOfferData] = useState(null);
//   const [streamData, setStreamData] = useState(null)

//   const restartPause = 2000;

//   useEffect(() => {
 
//     // socket.on('connect', () => {
//     //   console.log("Connected to the server");
//     // });
//     const fetchStreamData = async () => {
//       try {
//         const res = await axios.get('http://localhost:5000/stream/beach1', {
//           auth: {
//             username: "user1",
//             password: "9iKscFQzEwiE49hdEtrR49tg"
//           },
//         });

//         // If authentication is successful, the server could return the necessary details
//         // for establishing the WebRTC connection
//         const { live_stream_url, iceServers } = res.data;
//         setStreamData(res.data);

//         // Proceed with WebRTC connection establishment...
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchStreamData();

//     console.log(socket)
//   }, []);

//   useEffect(() => {
//     if (streamData) {
//       const { live_stream_url, username, password } = streamData;



//       socketRef.current = io(live_stream_url, {
//         auth: {
//           username,
//           password,
//         },
//       });
//       console.log(socketRef.current)
//       socketRef.current.on('connect_error', (err) => {
//         console.log(`Connect Error: ${err.message}`);
//       });
//       socketRef.current.on('iceServers', onIceServers);
//       socketRef.current.on('remoteAnswer', onRemoteAnswer);

//       start();

//       return () => {
//         if (pc !== null) {
//           pc.close();
//         }

//         if (restartTimeout !== null) {
//           clearTimeout(restartTimeout);
//         }

//         if (socketRef.current) {
//           socketRef.current.disconnect();
//         }
//       }
//     }
//   }, [streamData]);

//   const start = () => {
//     if (socketRef.current) {
//       socketRef.current.emit('getIceServers');
//     }
//   };

//   const onIceServers = (data) => {
//     let pcInstance = new RTCPeerConnection({
//       iceServers: linkToIceServers(data.iceServers),
//     });


//     const direction = "sendrecv";
//     pcInstance.addTransceiver("video", { direction });
//     pcInstance.addTransceiver("audio", { direction });

//     pcInstance.onicecandidate = (evt) => onLocalCandidate(evt);
//     pcInstance.oniceconnectionstatechange = () => onConnectionState();

//     pcInstance.ontrack = (evt) => {
//       console.log("new track:", evt.track.kind);
//       videoRef.current.srcObject = evt.streams[0];
//     };

//     pcInstance.createOffer()
//       .then((offer) => onLocalOffer(offer));
//     setPc(pcInstance);
//   }

//   const onLocalOffer = (offer) => {
//     const parsedOffer = parseOffer(offer.sdp);
//     setOfferData(parsedOffer);
//     pc.setLocalDescription(offer);

//     socketRef.current.emit('sendOffer', {
//       offer: offer.sdp,
//     });
//   };

//   const onLocalCandidate = (evt) => {
//     if (restartTimeout !== null) {
//       return;
//     }

//     if (evt.candidate !== null) {
//       if (eTag === '') {
//         setQueuedCandidates(oldCandidates => [...oldCandidates, evt.candidate]);
//       } else {
//         sendLocalCandidates([evt.candidate]);
//       }
//     }
//   }

//   const sendLocalCandidates = (candidates) => {
//     socketRef.current.emit('sendLocalCandidates', {
//       eTag,
//       candidates: generateSdpFragment(offerData, candidates),
//     });
//   }

//   const onConnectionState = () => {
//     if (restartTimeout !== null) {
//       return;
//     }

//     console.log("peer connection state:", pc.iceConnectionState);

//     switch (pc.iceConnectionState) {
//       case "disconnected":
//         scheduleRestart();
//     }
//   }

//   const onRemoteAnswer = (answer) => {
//     if (restartTimeout !== null) {
//       return;
//     }

//     pc.setRemoteDescription(new RTCSessionDescription(answer));

//     if (queuedCandidates.length !== 0) {
//       sendLocalCandidates(queuedCandidates);
//       setQueuedCandidates([]);
//     }
//   }

//   const scheduleRestart = () => {
//     if (restartTimeout !== null) {
//       return;
//     }

//     if (pc !== null) {
//       pc.close();
//       setPc(null);
//     }

//     setRestartTimeout(window.setTimeout(() => {
//       setRestartTimeout(null);
//       start();
//     }, restartPause));

//     setETag('');
//     setQueuedCandidates([]);
//   }

//   useEffect(() => {
//     start();

//     return () => {
//       if (pc !== null) {
//         pc.close();
//       }

//       if (restartTimeout !== null) {
//         clearTimeout(restartTimeout);
//       }
//     }
//   }, []);

//   return (
//     <video ref={videoRef} muted controls autoPlay playsInline />
//   );

//   // useEffect(() => {
//   //   const socket = io('http://localhost:5000'); // Replace with your server address
//   //   socket.on('connect', () => {
//   //          console.log("Connected to the server");
//   //          });

//   //   const restartPause = 2000;
//   //   const unquoteCredential = (v) => JSON.parse(`"${v}"`);
//   //   const linkToIceServers = (links) => 
//   //     links !== null 
//   //       ? links.split(', ').map((link) => {
//   //           const m = link.match(
//   //             /^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i
//   //           );
//   //           const ret = {
//   //             urls: [m[1]],
//   //           };

//   //           if (m[3] !== undefined) {
//   //             ret.username = unquoteCredential(m[3]);
//   //             ret.credential = unquoteCredential(m[4]);
//   //             ret.credentialType = 'password';
//   //           }

//   //           return ret;
//   //         })
//   //       : [];

//   //   const parseOffer = (offer) => {
//   //     const ret = {
//   //       iceUfrag: '',
//   //       icePwd: '',
//   //       medias: [],
//   //     };

//   //     for (const line of offer.split('\r\n')) {
//   //       if (line.startsWith('m=')) {
//   //         ret.medias.push(line.slice('m='.length));
//   //       } else if (ret.iceUfrag === '' && line.startsWith('a=ice-ufrag:')) {
//   //         ret.iceUfrag = line.slice('a=ice-ufrag:'.length);
//   //       } else if (ret.icePwd === '' && line.startsWith('a=ice-pwd:')) {
//   //         ret.icePwd = line.slice('a=ice-pwd:'.length);
//   //       }
//   //     }

//   //     return ret;
//   //   };

//   //   const generateSdpFragment = (offerData, candidates) => {
//   //     const candidatesByMedia = {};
//   //     for (const candidate of candidates) {
//   //       const mid = candidate.sdpMLineIndex;
//   //       if (candidatesByMedia[mid] === undefined) {
//   //         candidatesByMedia[mid] = [];
//   //       }
//   //       candidatesByMedia[mid].push(candidate);
//   //     }

//   //     let frag = 'a=ice-ufrag:' + offerData.iceUfrag + '\r\n' + 'a=ice-pwd:' + offerData.icePwd + '\r\n';

//   //     let mid = 0;

//   //     for (const media of offerData.medias) {
//   //       if (candidatesByMedia[mid] !== undefined) {
//   //         frag +=
//   //           'm=' +
//   //           media +
//   //           '\r\n' +
//   //           'a=mid:' +
//   //           mid +
//   //           '\r\n' +
//   //           candidatesByMedia[mid].map((candidate) => 'a=' + candidate.candidate + '\r\n').join('');
//   //       }
//   //       mid++;
//   //     }

//   //     return frag;
//   //   };

//   //   class WHEPClient {
//   //     constructor(socket) {
//   //       this.socket = socket;
//   //       this.pc = null;
//   //       this.restartTimeout = null;
//   //       this.eTag = '';
//   //       this.queuedCandidates = [];
//   //       this.start();
//   //     }

//   //     start() {
//   //       axios
//   //         .get('http://localhost:5000/stream/beach1')
//   //         .then((res) => {
//   //           if (res.status !== 200) {
//   //             throw new Error('bad status code');
//   //           }
//   //           return res.data;
//   //         })
//   //         .then((data) => {
//   //         this.onIceServers(data)
//   //       })
//   //         .catch((err) => {

//   //           console.log('error: ' + err);
//   //           this.scheduleRestart();
//   //         });
//   //     }

//   //     onIceServers(data) {
//   //       console.log("data.iceServers:", data);
//   //       this.socket.emit('getIceServers', data, (err) => {
//   //         if (err) {
//   //           console.log('error: ' + err);
//   //           this.scheduleRestart();
//   //         }
//   //       });

//   //       this.pc = new RTCPeerConnection({
//   //         iceServers: linkToIceServers(data),
//   //       });

//   //       const direction = 'sendrecv';
//   //       this.pc.addTransceiver('video', { direction });
//   //       this.pc.addTransceiver('audio', { direction });

//   //       this.pc.onicecandidate = (evt) => this.onLocalCandidate(evt);
//   //       this.pc.oniceconnectionstatechange = () => this.onConnectionState();

//   //       this.pc.ontrack = (evt) => {
//   //         console.log('new track:', evt.track.kind);
//   //         document.getElementById('video').srcObject = evt.streams[0];
//   //       };

//   //       this.pc.createOffer().then((offer) => this.onLocalOffer(offer));
//   //     }

//   //     onLocalOffer(offer) {
//   //       this.socket.emit('createOffer', offer, (err) => {
//   //         if (err) {
//   //           console.log('error: ' + err);
//   //           this.scheduleRestart();
//   //         }
//   //       });

//   //       this.offerData = parseOffer(offer.sdp);
//   //       this.pc.setLocalDescription(offer);

//   //       console.log('sending offer');

//   //       axios
//   //         .post('http://localhost:5000/stream', { sdp: offer.sdp })
//   //         .then((res) => {
//   //           if (res.status !== 200) {
//   //             throw new Error('bad status code');
//   //           }
//   //           this.eTag = res.headers['e-tag'];
//   //           return res.data.sdp;
//   //         })
//   //         .then((sdp) => this.onRemoteAnswer(new RTCSessionDescription({ type: 'answer', sdp })))
//   //         .catch((err) => {
//   //           console.log('error: ' + err);
//   //           this.scheduleRestart();
//   //         });
//   //     }

//   //     onConnectionState() {
//   //       if (this.restartTimeout !== null) {
//   //         return;
//   //       }

//   //       console.log('peer connection state:', this.pc.iceConnectionState);

//   //       switch (this.pc.iceConnectionState) {
//   //         case 'disconnected':
//   //           this.scheduleRestart();
//   //           break;
//   //       }
//   //     }

//   //     onRemoteAnswer(answer) {
//   //       if (this.restartTimeout !== null) {
//   //         return;
//   //       }

//   //       this.pc.setRemoteDescription(new RTCSessionDescription(answer));

//   //       if (this.queuedCandidates.length !== 0) {
//   //         this.sendLocalCandidates(this.queuedCandidates);
//   //         this.queuedCandidates = [];
//   //       }
//   //     }

//   //     onLocalCandidate(evt) {
//   //       if (evt.candidate !== null) {
//   //         this.socket.emit('sendCandidate', evt.candidate, (err) => {
//   //           if (err) {
//   //             console.log('error: ' + err);
//   //             this.scheduleRestart();
//   //           }
//   //         });
//   //       }

//   //       if (this.restartTimeout !== null) {
//   //         return;
//   //       }

//   //       if (evt.candidate !== null) {
//   //         if (this.eTag === '') {
//   //           this.queuedCandidates.push(evt.candidate);
//   //         } else {
//   //           this.sendLocalCandidates([evt.candidate]);
//   //         }
//   //       }
//   //     }

//   //     sendLocalCandidates(candidates) {
//   //       axios
//   //         .patch('http://localhost:5000/stream/beach1', generateSdpFragment(this.offerData, candidates), {
//   //           headers: {
//   //             'Content-Type': 'application/trickle-ice-sdpfrag',
//   //             'If-Match': this.eTag,
//   //           },
//   //         })
//   //         .then((res) => {
//   //           if (res.status !== 204) {
//   //             throw new Error('bad status code');
//   //           }
//   //         })
//   //         .catch((err) => {
//   //           console.log('error: ' + err);
//   //           this.scheduleRestart();
//   //         });
//   //     }

//   //     scheduleRestart() {
//   //       if (this.restartTimeout !== null) {
//   //         return;
//   //       }

//   //       if (this.pc !== null) {
//   //         this.pc.close();
//   //         this.pc = null;
//   //       }

//   //       this.restartTimeout = window.setTimeout(() => {
//   //         this.restartTimeout = null;
//   //         this.start();
//   //       }, restartPause);

//   //       this.eTag = '';
//   //       this.queuedCandidates = [];
//   //     }
//   //   }

//   //   const client = new WHEPClient(socket);

//   //   // Cleanup on unmount
//   //   return () => {
//   //     if (client.restartTimeout !== null) {
//   //       clearTimeout(client.restartTimeout);
//   //     }

//   //     if (client.pc !== null) {
//   //       client.pc.close();
//   //     }

//   //     // Disconnect the socket
//   //     socket.disconnect();
//   //   };
//   // }, []);

//   // return <video id="video" muted controls autoPlay playsInline style={{ width: '100%', height: '100%', background: 'black' }} />;
// }

// export default LiveStream;