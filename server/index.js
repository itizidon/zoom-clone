import express from 'express'
import http from 'http'
const app = express()
app.use(cors())
const server = http.createServer(app)
import socket from 'socket.io'
const io = socket(server)
import cors from 'cors'
import RoomList from './util/util'

let room = {  }

io.on('connection', socket => {
  socket.on('connectToRooms', roomNum => {
    socket.join(roomNum, () => {
      if (Object.keys(io.sockets.adapter.rooms[roomNum].sockets).length === 1) {
        room[roomNum] = new RoomList()
        room[roomNum].add(socket.id)
        io.to(roomNum).emit('connectToRoom')
      } else {
        room[roomNum].add(socket.id)
        socket.to(roomNum).emit('makeConnection')
      }
    })
  })

  socket.on('video-answer-to-room', ({ roomNum, sdp }) => {
    socket.to(roomNum).emit('handle-answer-to-room', sdp)
  })

  socket.on('video-offer-to-room', ({ sdp, roomNum }) => {
    socket.to(roomNum).emit('handle-offer-to-room', sdp)
  })

  socket.on('new-ice-candidate-to-room', ({ roomNum, candidate }) => {
    socket.to(roomNum).emit('handle-new-ice-candidate-to-room', candidate)
  })

  socket.on('changeName', name =>{
    console.log(name)
  })
})

server.listen(8000, () => console.log('running on 800'))
