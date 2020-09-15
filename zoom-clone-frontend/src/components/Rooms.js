import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { withRouter } from 'react-router'

const socket = io('http://localhost:8000')

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}

let myPeerConnection
let userStream

function Rooms(props) {
  const userVideo = useRef()
  const otherStreams = useRef([])
  const partnerVideo = useRef()
  useEffect(() => {
    socket.on('connectToRoom', () => {
      joinroom()
    })

    socket.on('handle-new-ice-candidate', candidate => {
      if (candidate) {
        const newCandidate = new RTCIceCandidate(candidate)
        myPeerConnection.addIceCandidate(newCandidate)
      }
    })

    socket.on('handle-answer-to-room', createdAnswer => {
      const desc = new RTCSessionDescription(createdAnswer)
      myPeerConnection.setRemoteDescription(desc)
    })

    socket.on('handle-offer-to-room', createdOffer => {
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
          socket.emit('video-answer-to-room', {
            roomNum: props.match.params.id,
            sdp: myPeerConnection.localDescription
          })
        })
    })
  })

  function handleTrackEvent(event) {
    partnerVideo.current.srcObject = event.streams[0]
  }

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

  function handleNegotiationNeededEvent() {
    myPeerConnection
      .createOffer()
      .then(function(offer) {
        return myPeerConnection.setLocalDescription(offer)
      })
      .then(() => {
        socket.emit('video-offer-to-room', {
          sdp: myPeerConnection.localDescription,
          roomNum: props.match.params.id
        })
      })
  }

  function joinroom() {
    createPeerConnection()
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
      userVideo.current.srcObject = streamz
      userStream = streamz
      streamz
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, streamz))
    })
  }

  function handleICECandidateEvent(event) {
    socket.emit('new-ice-candidate-to-room', {
      roomNum: props.match.params.id,
      candidate: event.candidate
    })
  }

  return (
    <div>
      <video autoPlay ref={userVideo}></video>
      <button
        onClick={() => {
          socket.emit('connectToRooms', props.match.params.id)
        }}
      >
        Connect
      </button>
    </div>
  )
}

export default withRouter(Rooms)
