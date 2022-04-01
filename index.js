require("dotenv").config();
const debug = require("debug")("discord-local-bot:index");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { program } = require("commander");

program.requiredOption("-ch, --challenge <string>");

program.parse();

const { challenge } = program.opts();

const chalk = require("chalk");
const { Client, Intents } = require("discord.js");

const extractInfo = async (messageData) => {
  const message = messageData.content.trim();
  let { nickname } = await messageData.guild.members.fetch(messageData.author);
  nickname = nickname
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll(" ", "-")
    .toLowerCase();

  return {
    message,
    nickname,
  };
};

const cloneRepo = (repoURL, channel, category, nickname) => {
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

    if (fs.existsSync(path.join(folder, nickname))) {
      debug(chalk.yellow(`El repo ${nickname} ya existe localmente`));
    } else {
      debug(chalk.yellow(`Clonando repo ${repoURL}`));

      const stdoutGitClone = execSync(`git clone ${repoURL} ${nickname}`, {
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

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.login(process.env.DISCORD_TOKEN);

client.on("ready", async () => {
  debug(chalk.yellow(`Logged in as ${client.user.tag}!`));

  const nWeek = challenge.charAt(1);
  const nChallenge =
    challenge.charAt(4) === "we" ? "weekend" : challenge.charAt(4);

  const categoryName = `Week ${nWeek}`;
  const channelName = `challenge-${nChallenge}`;

  const challengeCategory = client.channels.cache.find(
    (category) => category.name === categoryName
  );
  const challengeChannel = client.channels.cache.find(
    (channel) =>
      channel.name === channelName && channel.parentId === challengeCategory.id
  );
  debug(
    chalk.greenBright(
      `Localizada categoría ${challengeCategory.name} y canal ${challengeChannel.name}`
    )
  );
  const messages = await challengeChannel.messages.fetch();
  messages.forEach(async (message) => {
    const { message: content, nickname } = await extractInfo(message);
    debug(chalk.green(`Parseando mensaje de ${nickname}: ${content}`));
    if (
      (content.startsWith("Repo:") ||
        content.startsWith("Front - repo:") ||
        content.startsWith("Back - repo:")) &&
      content.includes("https://github.com")
    ) {
      const repoURLPosition = content.search("https://github.com");
      const repoURL = content.slice(repoURLPosition);
      cloneRepo(repoURL, channelName, categoryName, nickname);
    }
  });
});
