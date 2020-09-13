import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { withRouter } from "react-router";

const socket = io('http://localhost:8000')

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}

let userStream

function Rooms(props) {
  const userVideo = useRef()
  const otherStreams = useRef([])
  useEffect(() => {
    socket.on('createroom', () => {
      joinroom()
    })
  })

  function joinroom() {
    // createPeerConnection()
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
      userVideo.current.srcObject = streamz
      userStream = streamz
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
