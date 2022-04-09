require("dotenv").config();
const debug = require("debug")("discord-local-bot:index");
const { execSync } = require("child_process");
const { program } = require("commander");
const { Client, Intents } = require("discord.js");
const chalk = require("chalk");

const { extractWeekAndChallenge, extractInfo, cloneRepo } = require("./utils");
const classroomStudents = require("./students");
const { default: axios } = require("axios");

program.requiredOption(
  "-ch, --challenge <string>",
  "Challenge to parse, i.e. w1ch2"
);
program.option("-v, --validator");

program.parse();

const { challenge, validator } = program.opts();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.login(process.env.DISCORD_TOKEN);

client.on("ready", async () => {
  debug(chalk.yellow(`Logged in as ${client.user.tag}!`));

  const studentsDelivered = [];

  const { categoryName, channelName, challengeCategory, challengeChannel } =
    extractWeekAndChallenge(client, challenge);

  debug(
    chalk.greenBright(
      `Localizada categoría ${challengeCategory.name} y canal ${challengeChannel.name}`
    )
  );

  const messages = await challengeChannel.messages.fetch();

  for (const [, message] of messages) {
    try {
      const { message: content, nickname } = await extractInfo(message);
      if (content.startsWith("FORMATO")) {
        continue;
      }
      if (studentsDelivered.includes(nickname)) {
        debug(chalk.red("Entrega repetida"));
      } else {
        studentsDelivered.push(nickname);

        const lines = content.split("\n");
        for (const line of lines) {
          if (
            line.toLowerCase().startsWith("repo:") ||
            line.toLowerCase().replaceAll(" ", "").startsWith("front-repo:") ||
            line.toLowerCase().replaceAll(" ", "").startsWith("back-repo:")
          ) {
            const repoURLPosition = line.search("https://github.com");
            const repoURL = line.slice(repoURLPosition);
            cloneRepo(repoURL, channelName, categoryName, nickname);
          } else if (
            line.toLowerCase().startsWith("prod:") ||
            line.toLowerCase().replaceAll(" ", "").startsWith("front-prod:") ||
            line.toLowerCase().replaceAll(" ", "").startsWith("back-prod:")
          ) {
            const prodURLPosition = line.search("https://");
            const prodURL = line.slice(prodURLPosition);
            const response = await axios.get(prodURL);
            if (response.status === 404) {
              debug(chalk.red("La URL de producción da 404"));
            } else if (validator) {
              const stdoutValidator = execSync(
                `npx html-validator-cli ${prodURL}`,
                {
                  encoding: "utf-8",
                }
              );
              debug(stdoutValidator);
            }
          }
        }
      }
    } catch (error) {
      debug(chalk.red(error.message));
      continue;
    }
  }

  debug(
    chalk.blueBright(
      `Han entregado ${studentsDelivered.length}/${classroomStudents.length}`
    )
  );

  if (studentsDelivered.length < classroomStudents.length) {
    debug(
      chalk.red(
        "Faltan por entregar: ",
        classroomStudents
          .filter((student) => !studentsDelivered.includes(student))
          .join("\n")
      )
    );
  }
});
