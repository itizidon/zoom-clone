import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Redirect } from 'react-router'

let id = null

function Home() {
  const [toggle, setToggle] = useState(true)
  return (
    <div>
      LOL
      {toggle ? null : <Redirect to={`/rooms/${id}`}></Redirect>}
      <button
        onClick={() => {
          setToggle(false)
          id = uuidv4()
        }}
      >
        Create Room
      </button>
    </div>
  )
}

export default Home
