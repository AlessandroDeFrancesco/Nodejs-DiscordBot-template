"use strict";

const express = require('express');
const app = express();
const fs = require("fs");
const DiscordClient = require("./discordjs/client/Client");
const discordBot = new DiscordClient();
const klawSync = require('klaw-sync');

/*
* An array of:
*  {
*    path: filePath,
*    nameAndExtension: fileName,
*    name: fileNameWithoutExtension,
*    extension: fileExtension
*    parent: parentFolderName
*  }
*/
let allAudioFiles = klawSync("./sounds/", { nodir: true }).map(function (file) {
  var filePath = file.path;
  var split = filePath.split("\\");
  if (filePath.indexOf("/") != -1)
    split = filePath.split("/");
  var fileName = split[split.length - 1];
  var fileNameWithoutExtension = fileName.split(".")[0];
  var fileExtension = fileName.split(".")[1];
  var parentFolderName = split[split.length - 2];

  var details = {
    path: filePath,
    nameAndExtension: fileName,
    name: fileNameWithoutExtension,
    extension: fileExtension,
    parent: parentFolderName
  }

  return details;
}).filter((file) => file.extension == "ogg");


var currentVoiceChannel = null;

/**
 * When a message is read from Discord
 */
discordBot.on("message", message => {
  if (message.content.length < 5 || message.content.substring(0, 1) != "!")
    return

  try {
    const command = message.content.substring(0, 5);
    console.log("Received command " + command);

    if (command == "!join") {
      joinVoiceChannel(message);
    } else if (command == "!play") {
      playAudio(message.content.split(" ")[1]);
    } else if (command == "!help") {
      showHelp(message);
    } else if (command == "!stop") {
      stopAudio();
    }
  } catch (error) {
    console.log(error);
  }
});

function joinVoiceChannel(message) {
  console.log("Joining " + message.member.voice.channel);
  var voiceChannel = message.member.voice.channel;
  if (voiceChannel != null && voiceChannel != undefined) {
    voiceChannel
      .join()
      .then(connection => {
        currentVoiceChannel = connection;
        showHelp(message);
      })
      .catch(err => {
        console.log("Couldn't join voice channel " + err);
      });
  }
}

function showHelp(message) {
  var files = "";
  allAudioFiles.forEach(audio => {
    files += "\n" + audio.name;
  });
  message.reply("Commands:\n" +
    "!help \tto show the help\n" +
    "!join \tto join your current voice channel\n" +
    "!play {audio_name} \tto play an audio with a name {audio_name}\n" +
    "!stop \tto stop the currently streamed audio\n" +
    "\nAvailable audios:" +
    files
  );
}

var alreadyPlaying = false;

function playAudio(fileName) {
  try {
    let file = allAudioFiles.find(file => {
      return file.name == fileName;
    });

    if (currentVoiceChannel != null && file != null && !alreadyPlaying) {
      alreadyPlaying = true;
      console.log("Playing audio " + fileName);
      const dispatcher = currentVoiceChannel.play(fs.createReadStream(file.path), {
        type: "ogg/opus"
      });
      dispatcher.on("end", end => {
        console.log("Played " + fileName);
        alreadyPlaying = false;
      });
    }
  } catch (error) {
    console.log("Couldn't play audio " + fileName + "\n" + error);
  }
}

function stopAudio() {
  if (currentVoiceChannel != null)
    currentVoiceChannel.dispatcher.end();
}

/**
 * Initialize Discord
 */

console.log("Logging...");
discordBot.login(process.env.DISCORD_BOT_TOKEN);
console.log("Logged discord");

/**
 * Initialize Express (Only useful for Heroku that needs to bind to a port)
 */
app.get('/', (req, res) => res.send('Hello!\nThis is a Bot for Discord!'));
app.listen(process.env.PORT || 8080, () => { });