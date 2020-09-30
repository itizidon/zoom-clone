export default function RoomList() {
  let head = null
  let Node = function(user) {
    this.user = user
    this.userName = null
    this.next = null
  }

  this.size = function() {
    let currentNode = head
    let count = 0
    while (currentNode) {
      currentNode = currentNode.next
      count++
    }
    return count
  }

  this.head = function() {
    return head
  }
  this.add = function(userId) {
    let user = new Node(userId)
    if (head === null) {
      head = user
    } else {
      let currentNode = head
      while (currentNode.next) {
        currentNode = currentNode.next
      }
      currentNode.next = user
    }
  }

  this.changeName = function(user, name, currentNodeAdd = head) {
    let currentNode = currentNodeAdd
    if(user === currentNode.user){
      currentNode.name = name
    }
    else{
      this.changeName(user, name, currentNode.next)
    }
  }

  this.elementAt = function(index) {
    let currentNode = head
    let count = 0
    while (count < index) {
      count++
      currentNode = currentNode.next
    }
    return currentNode
  }

  this.removeAtIndex = function(index) {
    let currentNode = head
    let previousNode
    if (currentNode.player.order === index) {
      head = currentNode.next
    } else {
      while (currentNode.player.order !== index) {
        previousNode = currentNode
        currentNode = currentNode.next
      }
      previousNode.next = currentNode.next
    }
  }
}
