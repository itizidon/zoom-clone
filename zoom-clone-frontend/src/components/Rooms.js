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
  audio: false
}

let myPeerConnection
let userStream
let sentTracks = []

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
        .forEach(track =>
          sentTracks.push(myPeerConnection.addTrack(track, userStream))
        )
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
            sentTracks.push(myPeerConnection.addTrack(track, userStream))
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
    setAllVideos(oldArray => {
      //if true
      if (oldArray.curState) {
        let newObj = {}

        newObj.listOfStreams = oldArray.listOfStreams
        newObj.curState = false

        return newObj
      } else {
        let newRef = React.createRef()
        let newObj = {}

        newObj.listOfStreams = oldArray.listOfStreams
        newObj.listOfStreams[
          newObj.listOfStreams.length - 1
        ].current.srcObject = event.streams[0]

        newObj.listOfStreams = [...oldArray.listOfStreams, newRef]
        newObj.curState = true
        return newObj
      }
    })
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
      ],
      sdpSemantics: 'unified-plan'
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

  console.log(allVideos, 'this is rerender addvideos')
  return (
    <div>
      <video autoPlay ref={userVideo}></video>
      {allVideos.listOfStreams.length >= 1
        ? allVideos.listOfStreams.map((cur, indx) => {
            return <video key={indx} autoPlay ref={cur}></video>
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
          console.log('this is run', sentTracks)
          navigator.mediaDevices
            .getDisplayMedia(displayMediaOptions)
            .then(videoStream => {
              let screenVideo = videoStream.getTracks()[0]
              console.log(screenVideo, 'tgus tii')
              console.log(
                videoStream.getTracks()[0],
                'this is what im looking for'
              )
                userVideo.current.srcObject = videoStream
              sentTracks
                .find(sender => {
                  return sender.track.kind === 'video'
                })
                .replaceTrack(screenVideo)
            })
        }}
      >
        Share Screen
      </button>
    </div>
  )
}

export default withRouter(Rooms)
