import axios from "axios";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";

console.clear();
console.log(chalk.bold.green("\nThe GitHub Purger\n- A 404navdeep Production"));
console.log(chalk.bold.green("\nPlease create a PAT token from your GitHub account settings."));
console.log(chalk.bold.green("https://github.com/settings/tokens/new"));
console.log(chalk.bold.green("Please make sure to give Read and Write access to administration scope"));

function formatRepo(repo) {
  const stars = chalk.yellow(`${repo.stargazers_count}⭐`);
  const updated = chalk.gray(`Updated: ${new Date(repo.updated_at).toLocaleDateString()}`);
  return `${chalk.cyan(repo.name)} (${stars}) — ${updated}`;
}

async function githubPurger() {
  const { token } = await inquirer.prompt([
    {
      type: "password",
      name: "token",
      message: "Enter your recently created GitHub Personal Access Token (PAT):",
      mask: "*",
      validate: (input) => input.length > 0 || "Token cannot be empty",
    },
  ]);

  const spinner = ora("Getting those juicy repositories!..").start();

  try {
    const res = await axios.get("https://api.github.com/user/repos?per_page=100", {
      headers: { Authorization: `Bearer ${token}` },
    });
    spinner.succeed("Fetched repositories!");
    const repos = res.data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const { selected } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selected",
        message: "Select repositories to delete:",
        choices: repos.map((repo) => ({
          name: formatRepo(repo),
          value: repo,
        })),
        pageSize: 15,
      },
    ]);

    if (selected.length === 0) {
      console.log(chalk.yellow("\nNo repositories selected. Exiting."));
      return;
    }

    console.log(chalk.red.bold("\nYou are about to delete:"));
    selected.forEach((repo) => console.log("  •", chalk.red(repo.full_name)));

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to delete these juicy repositories? I mean check twice, this action cannot be redone!",
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("\nCancelled. No repositories deleted."));
      return;
    }

    const delSpinner = ora("Deleting repositories...").start();

    for (const repo of selected) {
      await axios.delete(`https://api.github.com/repos/${repo.full_name}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      delSpinner.succeed(`Deleted ${repo.full_name}`);
      delSpinner.start();
    }

    delSpinner.succeed(chalk.green("All the selected repositories have been deleted successfully!"));
  } catch (err) {
    spinner.fail("Failed to fetch or delete repositories, check the code!");
    console.error(chalk.red(err.message));
  }
}

githubPurger();
