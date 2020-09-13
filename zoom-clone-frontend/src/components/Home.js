import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Redirect } from 'react-router'

let id = null

function Home() {
  const [toggle, setToggle] = useState(true)
  return (
    <div>
      LOL
      {toggle ? null : <Redirect to={`/room/${id}`}></Redirect>}
      <button
        onClick={() => {
          console.log('clicked')
          setToggle(false)
          id = uuidv4()
        }}
      >Create Room</button>
    </div>
  )
}

export default Home
