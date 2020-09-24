import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { withRouter } from 'react-router'

const socket = io('http://localhost:8000')

let mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
}

var displayMediaOptions = {
  video: {
    cursor: 'always'
  },
  audio: true
}

let myPeerConnection
let userStream

function Rooms(props) {
  const userVideo = useRef()
  const [allVideos, setAllVideos] = useState({
    listOfStreams: [React.createRef()],
    curState: true
  })

  useEffect(() => {
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
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
  }, [])

  function handleTrackEvent(event) {
    if (allVideos.curState === true) {
      let newRef = React.createRef()
      setAllVideos(oldArray => {
        let newObj = {}
        oldArray.listOfStreams[
          oldArray.listOfStreams.length - 1
        ].current.srcObject = event.streams[0]
        oldArray.listOfStreams = [...oldArray.listOfStreams, newRef]
        oldArray.curState = false

        newObj.listOfStreams = oldArray.listOfStreams

        newObj.curState = false
        return newObj
      })
    } else {
      setAllVideos(oldArray => {
        let newObj = {}
        oldArray.listOfStreams[
          oldArray.listOfStreams.length - 2
        ].current.srcObject = event.streams[0]

        newObj.listOfStreams = oldArray.listOfStreams
        newObj.curState = true
        return newObj
      })
    }
    console.log(allVideos)
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
    if (event.candidate) {
      socket.emit('new-ice-candidate-to-room', {
        roomNum: props.match.params.id,
        candidate: event.candidate
      })
    }
  }
  return (
    <div>
      <video autoPlay ref={userVideo}></video>
      {allVideos.listOfStreams.length >= 1
        ? allVideos.listOfStreams.map(cur => {
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
      <button
        onClick={() => {
          navigator.mediaDevices
            .getDisplayMedia(displayMediaOptions)
            .then(videoStream => {
              videoStream.getTracks().forEach(track => {
                myPeerConnection.addTrack(track, videoStream)
              })
            })
        }}
      >
        Share Screen
      </button>
    </div>
  )
}

export default withRouter(Rooms)
