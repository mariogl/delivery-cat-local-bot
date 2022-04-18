require("dotenv").config();
const debug = require("debug")("discord-local-bot:index");
const { execSync } = require("child_process");
const { program } = require("commander");
const { Client, Intents } = require("discord.js");
const chalk = require("chalk");

const {
  extractWeekAndChallenge,
  extractInfo,
  cloneRepo,
  lineIsRepo,
  lineIsProd,
  lineIsGroup,
} = require("./utils");
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
  const groupsStudents = [];

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
          if (lineIsRepo(line) && !validator) {
            const repoURLPosition = line.search("https://github.com");
            const repoURL = line.slice(repoURLPosition);
            let folderName = nickname;
            if (groupsStudents.length > 0) {
              const groupFound = groupsStudents.find((group) =>
                group.includes(nickname)
              );
              if (groupFound) {
                folderName = groupFound.join("-");
              }
            }
            cloneRepo(repoURL, channelName, categoryName, folderName);
          } else if (lineIsProd(line)) {
            const prodURLPosition = line.search("https://");
            const prodURL = line.slice(prodURLPosition);
            debug(chalk.green("Comprobando URL de producción"));
            const response = await axios.get(prodURL);
            if (response.status === 404) {
              debug(chalk.red("La URL de producción da 404"));
            } else if (validator) {
              debug(chalk.green("Comprobando HTML Validator"));
              const validatorURL = `https://validator.w3.org/nu/?doc=${prodURL}`;
              const {
                data: { messages },
              } = await axios.get(`${validatorURL}&out=json`);
              const errors = messages.filter(
                (message) => message.type === "error"
              );
              const warnings = messages.filter(
                (message) => message.type === "info"
              );
              if (errors.length > 0) {
                debug(
                  chalk.red.bold(`${errors.length} errores al validar HTML`)
                );
              }
              if (warnings.length > 0) {
                debug(
                  chalk.yellow.bold(
                    `${warnings.length} warnings al validar HTML`
                  )
                );
              }
              if (errors.length === 0 && warnings.length === 0) {
                debug(chalk.green.bold("OK"));
              } else {
                debug(chalk.red(validatorURL));
              }
            }
          } else if (lineIsGroup(line)) {
            const group = line.toLowerCase().replace("grupo:", "").trim();
            debug(chalk.cyanBright("Grupo: ", group));
            const groupComponents = group.split(" - ").map((student) =>
              student
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .replaceAll(" ", "-")
                .toLowerCase()
            );
            groupsStudents.push(groupComponents);
            for (const student of groupComponents) {
              if (!studentsDelivered.includes(student)) {
                studentsDelivered.push(student);
              }
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
