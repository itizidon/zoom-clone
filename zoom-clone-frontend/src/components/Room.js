import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}
const socket = io('http://localhost:8000')

let myPeerConnection
let userStream

let displayMediaOptions = {
  video: {
    cursor: 'always'
  },
  audio: false
}

function Room() {
  const userVideo = useRef()
  const partnerVideo = useRef()
  const myScreen = useRef()
  const partnerScreen = useRef()
  const [toggle, setToggle] = useState(true)
  const [screenShareToggle, setScreenShareToggle] = useState(true)

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

    socket.on('startingScreenShare')

    socket.on('handle-new-ice-candidate', candidate => {
      if (candidate) {
        const newCandidate = new RTCIceCandidate(candidate)
        myPeerConnection.addIceCandidate(newCandidate)
      }
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
          { urls: 'stun:stun3.l.google.com:19302' },
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
      partnerVideo.current.srcObject = event.streams[0]
    }

    function handleNegotiationNeededEvent() {
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

  function addScreen() {
    navigator.mediaDevices
      .getDisplayMedia(displayMediaOptions)
      .then(display => {
        myScreen.current.srcObject = display
      })
  }

  return (
    <div>
      {toggle ? (
        <button
          onClick={() => {
            socket.emit('join room')
            setToggle(false)
          }}
        >
          Connect
        </button>
      ) : (
        <button
          onClick={() => {
            socket.emit('startScreenShare')
            setScreenShareToggle(false)
            addScreen()
          }}
        >
          ShareScreen
        </button>
      )}

      <video autoPlay ref={userVideo}></video>
      <video autoPlay ref={partnerVideo}></video>
      {screenShareToggle ? null : <video autoPlay ref={myScreen}></video>}
    </div>
  )
}

export default Room
