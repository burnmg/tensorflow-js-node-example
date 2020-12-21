require('@tensorflow/tfjs-node');

const http = require('http');
const socketio = require('socket.io');
const pitch_type = require('./pitch_type');

const TIMEOUT_BETWEEN_EPOCHS_MS = 500;
const PORT = 8001;

// util function to sleep for a given ms
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to start server, perform model training, and emit stats via the socket connection
let state = {
    trained:false
}
async function run() {
    const port = process.env.PORT || PORT;
    const server = http.createServer();
    const io = socketio(server);

    server.listen(port, () => {
        console.log(`  > Running socket on port: ${port}`);
    });

    io.on('connection', (socket) => {
        socket.on('predictSample', async (sample) => {
            if (state.trained) {
                io.emit('predictResult', await pitch_type.predictSample(sample));
            } else {
                io.emit('predictResult', 'Null');
            }
            
        });
    });

    let numTrainingIterations = 10;
    for (var i = 0; i < numTrainingIterations; i++) {
        console.log(`Training iteration : ${i+1} / ${numTrainingIterations}`);
        await pitch_type.model.fitDataset(pitch_type.trainingData, {
            epochs: 1
        });
        console.log('accuracyPerClass', await pitch_type.evaluate(true));
        await sleep(TIMEOUT_BETWEEN_EPOCHS_MS);
    }
    state.trained = true;
}

run();