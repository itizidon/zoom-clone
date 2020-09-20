import React, { useEffect, useRef, useState, createRef } from 'react'
import io from 'socket.io-client'
import { withRouter } from 'react-router'

const socket = io('http://localhost:8000')
let counter = 0

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}

let myPeerConnection
let userStream

function Rooms(props) {
  const userVideo = useRef()
  const otherStreams = useRef([])
  const [allVideos, setAllVideos] = useState([])
  const partnerVideo = useRef()
  const [toggle, setToggle] = useState(false)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
      console.log('captured screen')
      userVideo.current.srcObject = streamz
      userStream = streamz
    })

    socket.on('connectToRoom', () => {
      joinroom()
    })

    socket.on('makeConnection', () => {
      userStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, userStream))
    })
    console.log(userVideo, 'this is userVideo')

    socket.on('handle-new-ice-candidate', candidate => {
      if (candidate) {
        console.log('handle-new-ice-candidate')
        const newCandidate = new RTCIceCandidate(candidate)
        myPeerConnection.addIceCandidate(newCandidate)
      }
    })

    socket.on('handle-answer-to-room', createdAnswer => {
      console.log('handle answer')
      const desc = new RTCSessionDescription(createdAnswer)
      myPeerConnection.setRemoteDescription(desc)
    })

    socket.on('handle-offer-to-room', createdOffer => {
      createPeerConnection()
      console.log('handle-offer-room is hit')
      // var localStream
      var desc = new RTCSessionDescription(createdOffer)

      myPeerConnection
        .setRemoteDescription(desc)
        .then(stream => {
          userStream.getTracks().forEach(track => {
            myPeerConnection.addTrack(track, userStream)
            return 'return'
          })
        })
        .then(() => {
          console.log('this skipped user stream')
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
    console.log('added events', event.streams)
    partnerVideo.current.srcObject = event.streams[0]
    // console.log(partnerVideo.current)

    setAllVideos(allVideos.push(React.createRef()))
    // allVideos.current[0].current.srcObject=event.stream[0]
    console.log(allVideos, 'this is all videos current')
    // allVideos.current[allVideos.current.length - 1].current = {
    //   srcObject: event.streams[event.streams.length -1]
    // }
    // console.log('added track hit')
  }

  function createPeerConnection() {
    console.log('created peer')
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
    console.log('negotiationneeded ')
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
    console.log('reached join roon')
    createPeerConnection()
  }

  function handleICECandidateEvent(event) {
    console.log('new-ice-candidate-toroom')
    if (event.candidate) {
      socket.emit('new-ice-candidate-to-room', {
        roomNum: props.match.params.id,
        candidate: event.candidate
      })
    }
  }
  console.log(allVideos.length, 'this is length')
  return (
    <div>
      <video autoPlay ref={userVideo}></video>
      <video autoPlay ref={partnerVideo}></video>
      {allVideos.length >= 1
        ? allVideos.map(cur => {
            console.log(cur, 'this is cur')
            return <video autoPlay ref={cur}></video>
          })
        : null}
      {toggle ? (
        <button
          onClick={() => {
            socket.emit('connectToRooms', props.match.params.id)
            setToggle(true)
          }}
        >
          Connect
        </button>
      ) : null}
    </div>
  )
}

export default withRouter(Rooms)
