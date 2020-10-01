import React from 'react'
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom'
import Rooms from './components/Rooms'
import Home from './components/Home'
import './App.css'

export default function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <Link to="/">Home</Link>
          </ul>
        </nav>
        <Switch>
          <Route path="/rooms/:id">
            <Rooms />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  )
}
