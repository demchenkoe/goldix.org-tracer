
function randomInt(max = 2000, min = 100) {
  return Math.floor(Math.random() * max) + min;
}

function delay (ms) {
  if(!ms) {
    ms = randomInt()
  }
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { randomInt, delay }