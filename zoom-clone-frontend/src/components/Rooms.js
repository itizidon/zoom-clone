import React, { useEffect, useRef, useState, createRef } from 'react'
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
  const [allVideos, setAllVideos] = useState({
    listOfStreams: [React.createRef()],
    curState: true
  })
  const partnerVideo = useRef()

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
  },[])

  function handleTrackEvent(event) {
    console.log('added events', event.streams)
    // partnerVideo.current.srcObject = event.streams[0]
    // console.log(partnerVideo.current)
    if (allVideos.curState === true) {
      let newRef = React.createRef()
      // setAllVideos(oldArray => [...oldArray, newRef])
      setAllVideos(oldArray => {
        console.log('this is true')
        oldArray.listOfStreams[
          oldArray.listOfStreams.length - 1
        ].current.srcObject = event.streams[0]
        oldArray.listOfStreams = [...oldArray.listOfStreams, newRef]
        oldArray.curState = false
        return oldArray
      })
    } else {
      setAllVideos(oldArray => {
        console.log('this is false')
        oldArray.curState = true
        oldArray.listOfStreams[
          oldArray.listOfStreams.length - 2
        ].current.srcObject = event.streams[0]

        return oldArray
      })
    }
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

  console.log(allVideos, 'this is allvideos')
  return (
    <div>
      <video autoPlay ref={userVideo}></video>
      {/* <video autoPlay ref={partnerVideo}></video> */}
      {allVideos.listOfStreams.length >= 1
        ? allVideos.listOfStreams.map(cur => {
            console.log(cur, 'this is cur')
            return <video autoPlay ref={cur}></video>
          })
        : null}
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
