import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { withRouter } from 'react-router'

const socket = io('http://localhost:8000')

let mediaConstraints = {
  audio: true, // We want an audio track
  video: { width: 250, height: 250 } // ...and we want a video track
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
  const [toggle, setToggle] = useState(true)
  const [revert, setRevert] = useState(true)
  const [names, setNames] = useState([])
  const [linkToggle, setLinkToggle] = useState(true)

  useEffect(() => {
    navigator.clipboard.writeText(
      `http://localhost:3000/rooms/${props.match.params.id}`
    )

    navigator.mediaDevices.getUserMedia(mediaConstraints).then(streamz => {
      userVideo.current.srcObject = streamz
      userStream = streamz
    })

    socket.on('connectToRoom', () => {
      joinroom()
    })

    socket.on('changedNames', (name, index) => {
      setNames(oldArray => {
        let newArray = [...oldArray]
        newArray[index] = name
        return newArray
      })
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

  function disconnect() {
    if (myPeerConnection) {
      myPeerConnection.ontrack = null
      myPeerConnection.onremovetrack = null
      myPeerConnection.onremovestream = null
      myPeerConnection.onicecandidate = null
      myPeerConnection.oniceconnectionstatechange = null
      myPeerConnection.onsignalingstatechange = null
      myPeerConnection.onicegatheringstatechange = null
      myPeerConnection.onnegotiationneeded = null

      allVideos.listOfStreams.map(cur => {
        if (cur.current.srcObject) {
          cur.current.srcObject.getTracks().forEach(track => track.stop())
        }
      })

      myPeerConnection.close()
      myPeerConnection = null
    }
  }

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
  console.log(allVideos.listOfStreams)
  return (
    <div className="border">
      {linkToggle ? (
        <div>
          <h1>
            Link Copied
            <button
              onClick={() => {
                setLinkToggle(false)
              }}
            >
              Got It
            </button>
          </h1>
        </div>
      ) : (
        <button
          onClick={() => {
            navigator.clipboard.writeText(
              `http://localhost:3000/rooms/${props.match.params.id}`
            )
          }}
        >
          copy link
        </button>
      )}
      {toggle ? null : (
        <form
          onSubmit={event => {
            event.preventDefault()
            socket.emit('changeName', {
              name: event.target.name.value,
              roomNum: props.match.params.id
            })
          }}
        >
          <label>
            <input type="text" name="name"></input>
          </label>
        </form>
      )}

      <video autoPlay ref={userVideo} className="videocard"></video>

      {allVideos.listOfStreams.length >= 1
        ? allVideos.listOfStreams.map((cur, indx) => {
            return cur.current.srcObject === null ? null : (
              <div key={indx}>
                <p>{names[indx]}</p>
                <video autoPlay ref={cur} className="videocard"></video>
              </div>
            )
          })
        : null}
      {toggle ? (
        <button
          className="actions"
          onClick={() => {
            socket.emit('connectToRooms', props.match.params.id)

            setToggle(false)
          }}
        >
          Connect
        </button>
      ) : (
        <div>
          {revert ? (
            <button
              className="actions"
              onClick={() => {
                navigator.mediaDevices
                  .getDisplayMedia(displayMediaOptions)
                  .then(videoStream => {
                    let screenVideo = videoStream.getTracks()[0]
                    userVideo.current.srcObject = videoStream
                    sentTracks
                      .find(sender => {
                        return sender.track.kind === 'video'
                      })
                      .replaceTrack(screenVideo)
                  })
                setRevert(false)
              }}
            >
              Share Screen
            </button>
          ) : (
            <div>
              <button
                className="actions"
                onClick={() => {
                  navigator.mediaDevices
                    .getUserMedia(mediaConstraints)
                    .then(streamz => {
                      userVideo.current.srcObject = streamz
                      userStream = streamz
                      sentTracks
                        .find(sender => {
                          return sender.track.kind === 'video'
                        })
                        .replaceTrack(userStream.getTracks()[1])
                    })
                  setRevert(true)
                }}
              >
                Share Video
              </button>
            </div>
          )}
          <button
            className="actions"
            onClick={() => {
              disconnect()
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

export default withRouter(Rooms)
