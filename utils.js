require("dotenv").config();
const debug = require("debug")("discord-local-bot:utils");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const extractWeekAndChallenge = (client, challenge) => {
  const nWeek = challenge.charAt(1);
  const nChallenge =
    challenge.substring(4, 6) === "we" ? "weekend" : challenge.charAt(4);

  const categoryName = `Week ${nWeek}`;
  const channelName = `challenge-${nChallenge}`;

  const challengeCategory = client.channels.cache.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase()
  );
  const challengeChannel = client.channels.cache.find(
    (channel) =>
      channel.name === channelName && channel.parentId === challengeCategory.id
  );

  return { categoryName, channelName, challengeCategory, challengeChannel };
};

const extractInfo = async (messageData) => {
  try {
    const message = messageData.content.trim();
    let {
      nickname,
      // eslint-disable-next-line prefer-const
      user: { username },
    } = await messageData.guild.members.fetch({
      user: messageData.author,
      force: true,
    });
    if (nickname === "Delivery Cat" || username === "Delivery Cat") {
      const firstLine = message.split("\n")[0];
      nickname = firstLine.split(" de ")[1].trim();
    }
    debug(chalk.cyanBright("###############################"));
    debug(chalk.cyanBright("   Alumno: ", nickname || username));
    debug(chalk.cyanBright("###############################"));
    nickname = nickname || username;
    nickname = nickname
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replaceAll(" ", "-")
      .toLowerCase();

    return {
      message,
      nickname,
    };
  } catch (error) {
    debug(chalk.red("Error al intentar obtener la info del mensaje"));
    throw error;
  }
};

const cloneRepo = (repoURL, channel, category, folderName) => {
  try {
    const folder = path.join(
      process.env.BOOTCAMP_PATH,
      process.env.BOOTCAMP,
      category.toLowerCase().replace(" ", ""),
      "entregas",
      channel
    );
    debug(
      chalk.yellow(`Comprobando si existe la carpeta de entregas ${channel}`)
    );
    if (!fs.existsSync(folder)) {
      debug(chalk.yellow(`Creando carpeta de entregas ${channel}`));
      fs.mkdirSync(folder);
    }

    process.chdir(folder);
    if (fs.existsSync(path.join(folder, folderName))) {
      debug(chalk.yellow(`El repo ${folderName} ya existe localmente`));
    } else {
      debug(chalk.yellow(`Clonando repo ${repoURL}`));
      const stdoutGitClone = execSync(`git clone ${repoURL} ${folderName}`, {
        encoding: "utf-8",
      });

      debug(stdoutGitClone);
    }
  } catch (error) {
    debug(chalk.red(error.message));
    const customError = new Error("No se ha podido clonar el repo");
    throw customError;
  }
};

const lineIsRepo = (line) =>
  line.toLowerCase().startsWith("repo:") ||
  line.toLowerCase().replaceAll(" ", "").startsWith("front-repo:") ||
  line.toLowerCase().replaceAll(" ", "").startsWith("back-repo:");

const lineIsProd = (line) =>
  line.toLowerCase().startsWith("prod:") ||
  line.toLowerCase().replaceAll(" ", "").startsWith("front-prod:") ||
  line.toLowerCase().replaceAll(" ", "").startsWith("back-prod:");

const lineIsGroup = (line) => line.toLowerCase().includes("de grupo");

module.exports = {
  extractWeekAndChallenge,
  extractInfo,
  cloneRepo,
  lineIsRepo,
  lineIsProd,
  lineIsGroup,
};
