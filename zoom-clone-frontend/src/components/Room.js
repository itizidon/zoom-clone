import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}
const socket = io('http://localhost:8000')

let myPeerConnection

let userStream

function Room() {
  const userVideo = useRef()
  const partnerVideo = useRef()

  useEffect(() => {
    socket.on('first guy', () => {
      joinroom()
    })

    socket.on('createConnection', () => {
      userStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, userStream))
    })

    function joinroom() {
      createPeerConnection()
      navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
        userVideo.current.srcObject = streamz
        userStream = streamz
      })
    }

    // userStream
    //   .getTracks()
    //   .forEach(track => myPeerConnection.addTrack(track, userStream))

    socket.on('handle-new-ice-candidate', candidate => {
      const newCandidate = new RTCIceCandidate(candidate)
      myPeerConnection.addIceCandidate(newCandidate)
    })

    socket.on('handle-video-offer', createdOffer => {
      createPeerConnection()
      var localStream
      var desc = new RTCSessionDescription(createdOffer)

      myPeerConnection
        .setRemoteDescription(desc)
        .then(() => {
          return navigator.mediaDevices.getUserMedia(mediaConstraints)
        })
        .then(stream => {
          localStream = stream
          userVideo.current.srcObject = localStream

          localStream
            .getTracks()
            .forEach(track => myPeerConnection.addTrack(track, localStream))
        })
        .then(() => {
          return myPeerConnection.createAnswer()
        })
        .then(function(answer) {
          return myPeerConnection.setLocalDescription(answer)
        })
        .then(() => {
          socket.emit('video-answer', myPeerConnection.localDescription)
        })
    })

    socket.on('handle-video-answer', createdAnswer => {
      const desc = new RTCSessionDescription(createdAnswer)
      myPeerConnection.setRemoteDescription(desc)
    })

    function createPeerConnection() {
      myPeerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.stunprotocol.org' },
          {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
          }
        ]
      })

      myPeerConnection.onicecandidate = handleICECandidateEvent
      myPeerConnection.ontrack = handleTrackEvent
      myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent
    }

    function handleICECandidateEvent(event) {
      socket.emit('new-ice-candidate', event.candidate)
    }

    function handleTrackEvent(event) {

      console.log(event)
      partnerVideo.current.srcObject = event.streams[0]
    }

    function handleNegotiationNeededEvent() {
      console.log('negotiation needed')
      myPeerConnection
        .createOffer()
        .then(function(offer) {
          return myPeerConnection.setLocalDescription(offer)
        })
        .then(() => {
          socket.emit('video-offer', myPeerConnection.localDescription)
        })
    }
  }, [])

  return (
    <div>
      <button onClick={() => socket.emit('join room')}>Connect</button>
      <video autoPlay ref={userVideo}></video>
      <video autoPlay ref={partnerVideo}></video>
    </div>
  )
}

export default Room
