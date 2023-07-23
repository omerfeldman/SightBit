import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const Live = () => {


    const streamEncoder = useRef(null);
    const streamUrl = useRef(null);
    const [urlLoaded, setUrlLoaded] = useState(false)

    useEffect(() => {

        axios.get('http://localhost:5000/stream/beach1')
            .then(response => {
                const data = response.data;
                streamEncoder.current = btoa(data.stream.username + ":" + data.stream.password);
                streamUrl.current = data.stream.live_stream_url
                console.log(streamUrl.current)
                setUrlLoaded(true)
            })
            .catch(error => {
                console.log(error);
            });
    }, []);

    useEffect(() => {
        if (!urlLoaded) {
            return;
        }
        let pc = null;
        let restartTimeout = null;
        let eTag = '';
        let queuedCandidates = [];
        let offerData = null;
        const restartPause = 2000;

        const unquoteCredential = (v) => (
            JSON.parse(`"${v}"`)
        );

        const linkToIceServers = (links) => (
            (links !== null) ? links.split(', ').map((link) => {
                const m = link.match(/^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i);
                const ret = {
                    urls: [m[1]],
                };

                if (m[3] !== undefined) {
                    ret.username = unquoteCredential(m[3]);
                    ret.credential = unquoteCredential(m[4]);
                    ret.credentialType = "password";
                }

                return ret;
            }) : []
        );

        const parseOffer = (offer) => {
            const ret = {
                iceUfrag: '',
                icePwd: '',
                medias: [],
            };

            for (const line of offer.split('\r\n')) {
                if (line.startsWith('m=')) {
                    ret.medias.push(line.slice('m='.length));
                } else if (ret.iceUfrag === '' && line.startsWith('a=ice-ufrag:')) {
                    ret.iceUfrag = line.slice('a=ice-ufrag:'.length);
                } else if (ret.icePwd === '' && line.startsWith('a=ice-pwd:')) {
                    ret.icePwd = line.slice('a=ice-pwd:'.length);
                }
            }

            return ret;
        };

        const generateSdpFragment = (offerData, candidates) => {
            const candidatesByMedia = {};
            for (const candidate of candidates) {
                const mid = candidate.sdpMLineIndex;
                if (candidatesByMedia[mid] === undefined) {
                    candidatesByMedia[mid] = [];
                }
                candidatesByMedia[mid].push(candidate);
            }

            let frag = 'a=ice-ufrag:' + offerData.iceUfrag + '\r\n'
                + 'a=ice-pwd:' + offerData.icePwd + '\r\n';

            let mid = 0;

            for (const media of offerData.medias) {
                if (candidatesByMedia[mid] !== undefined) {
                    frag += 'm=' + media + '\r\n'
                        + 'a=mid:' + mid + '\r\n';

                    for (const candidate of candidatesByMedia[mid]) {
                        frag += 'a=' + candidate.candidate + '\r\n';
                    }
                }
                mid++;
            }

            return frag;
        }

        const start = () => {
            console.log("requesting ICE servers");
            console.log(streamUrl.current)
            fetch(new URL('whep', streamUrl.current + "/"), {
                method: 'OPTIONS',
            })
                .then((res) => onIceServers(res))
                .catch((err) => {
                    console.log('error: ' + err);
                    scheduleRestart();
                });
        };

        const onIceServers = (res) => {
            pc = new RTCPeerConnection({
                iceServers: linkToIceServers(res.headers.get('Link')),
            });

            const direction = "sendrecv";
            pc.addTransceiver("video", { direction });
            pc.addTransceiver("audio", { direction });

            pc.onicecandidate = (evt) => onLocalCandidate(evt);
            pc.oniceconnectionstatechange = () => onConnectionState();

            pc.ontrack = (evt) => {
                console.log("new track:", evt.track.kind);
                document.getElementById("video").srcObject = evt.streams[0];
            };

            pc.createOffer()
                .then((offer) => onLocalOffer(offer));
        };

        const onLocalOffer = (offer) => {
            offerData = parseOffer(offer.sdp);
            pc.setLocalDescription(offer);

            console.log("sending offer");
            console.log(streamEncoder.current)

            fetch(new URL('whep', streamUrl.current + "/"), {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + streamEncoder.current,
                    'Content-Type': 'application/sdp',
                },
                body: offer.sdp,
            })
                .then((res) => {
                    if (res.status !== 201) {
                        throw new Error('bad status code');
                    }
                    eTag = res.headers.get('E-Tag');
                    return res.text();
                })
                .then((sdp) => onRemoteAnswer(new RTCSessionDescription({
                    type: 'answer',
                    sdp,
                })))
                .catch((err) => {
                    console.log('error: ' + err);
                    scheduleRestart();
                });
        };

        const onConnectionState = () => {
            if (restartTimeout !== null) {
                return;
            }

            console.log("peer connection state:", pc.iceConnectionState);

            switch (pc.iceConnectionState) {
                case "disconnected":
                    scheduleRestart();
            }
        };

        const onRemoteAnswer = (answer) => {
            if (restartTimeout !== null) {
                return;
            }

            pc.setRemoteDescription(new RTCSessionDescription(answer));

            if (queuedCandidates.length !== 0) {
                sendLocalCandidates(queuedCandidates);
                queuedCandidates = [];
            }
        };

        const onLocalCandidate = (evt) => {
            if (restartTimeout !== null) {
                return;
            }

            if (evt.candidate !== null) {
                if (eTag === '') {
                    queuedCandidates.push(evt.candidate);
                } else {
                    sendLocalCandidates([evt.candidate])
                }
            }
        };

        const sendLocalCandidates = (candidates) => {
            fetch(new URL('whep', streamUrl.current + "/"), {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Basic ' + streamEncoder.current,
                    'Content-Type': 'application/trickle-ice-sdpfrag',
                    'If-Match': eTag,
                },
                body: generateSdpFragment(offerData, candidates),
            })
                .then((res) => {
                    if (res.status !== 204) {
                        throw new Error('bad status code');
                    }
                })
                .catch((err) => {
                    console.log('error: ' + err);
                    scheduleRestart();
                });
        };

        const scheduleRestart = () => {
            if (restartTimeout !== null) {
                return;
            }

            if (pc !== null) {
                pc.close();
                pc = null;
            }

            restartTimeout = window.setTimeout(() => {
                restartTimeout = null;
                start();
            }, restartPause);

            eTag = '';
            queuedCandidates = [];
        }

        // Start the client
        start();

        // Clean up function
        return () => {
            if (restartTimeout !== null) {
                window.clearTimeout(restartTimeout);
            }
            if (pc !== null) {
                pc.close();
            }
        };
    }, [streamEncoder, urlLoaded]);

    return (
        <div>
            <video id="video" muted controls autoPlay playsInline style={{ width: '500px', height: '300px' }} />
        </div>
    );
};

export default Live;