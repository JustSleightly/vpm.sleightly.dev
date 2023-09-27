# VPM Package Listing Template [<img src="https://github.com/JustSleightly/Resources/raw/main/Icons/JSLogo.png" width="30" height="30">](https://vrc.sleightly.dev/ "JustSleightly") [<img src="https://github.com/JustSleightly/Resources/raw/main/Icons/Discord.png" width="30" height="30">](https://discord.sleightly.dev/ "Discord") [<img src="https://github.com/JustSleightly/Resources/raw/main/Icons/GitHub.png" width="30" height="30">](https://github.sleightly.dev/ "Github") [<img src="https://github.com/JustSleightly/Resources/raw/main/Icons/Store.png" width="30" height="30">](https://store.sleightly.dev/ "Store")

[![GitHub stars](https://img.shields.io/github/stars/JustSleightly/vpm.sleightly.dev)](https://github.com/JustSleightly/vpm.sleightly.dev/stargazers) [![GitHub Tags](https://img.shields.io/github/tag/JustSleightly/vpm.sleightly.dev)](https://github.com/JustSleightly/vpm.sleightly.dev/tags) [![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/JustSleightly/vpm.sleightly.dev?include_prereleases)](https://github.com/JustSleightly/vpm.sleightly.dev/releases) [![GitHub issues](https://img.shields.io/github/issues/JustSleightly/vpm.sleightly.dev)](https://github.com/JustSleightly/vpm.sleightly.dev/issues) [![GitHub last commit](https://img.shields.io/github/last-commit/JustSleightly/vpm.sleightly.dev)](https://github.com/JustSleightly/vpm.sleightly.dev/commits/main) [![Discord](https://img.shields.io/discord/780192344800362506)](https://discord.sleightly.dev/)

A personalized template customized from [VRChat's Package Listing Template](https://github.com/vrchat-community/template-package-listing) primarily for me to instantiate extra package listings for myself more quickly, but also includes a handful of minor pull requests/updates.

## ▶ Getting Started

* Press [![Use This Template](https://user-images.githubusercontent.com/737888/185467681-e5fdb099-d99f-454b-8d9e-0760e5a6e588.png)](https://github.com/JustSleightly/VPM-Package-Listing-Template/generate)
to start a new GitHub project based on this template, and follow the directions there.
  * Choose a fitting repository name and description.
  * Set the visibility can be either 'Public' or 'Private', as the published page will be public either way.
  * You don't need to select 'Include all branches.'
* Edit this project on GitHub in your web browser, or clone it repository locally using Git.
  * If you're unfamiliar with Git and GitHub, [visit GitHub's documentation](https://docs.github.com/en/get-started/quickstart/)
  
## Setting up the Automation

You'll need to edit some of the files in this template, starting with [`source.json`](source.json):

* Fill out general information about your listing, such as the `name`, `id`, `author`, `description`, etc.
* Update the `url` field on line 4, replacing `justsleightly` with your GitHub username, and `VPM-Package-Listing-Template` with your repo name.
* Update the `url` and `text` within `infoLink` (on line 11) with what you'd like hyperlinked on the listing page.
* If you'd like to include packages hosted on GitHub, specify them in `githubRepos`.
  * `githubRepos` must include only public GitHub repositories
* If you'd like to include packages hosted elsewhere as a `.zip` file, specify them in `packages`.
  * You can safely remove either `githubRepos` or `packages` if you're not using them.
* Finally, go to the "Settings" page for your repo, then choose "Pages", and look for the heading "Build and deployment". Change the "Source" dropdown from "Deploy from a branch" to "GitHub Actions".

## 📃 Rebuilding the Listing

The listing will rebuild whenever `.github/workflows/build-listing.yml` is:

1. Triggered manually from the `Actions` tab
2. Triggered automatically when a commit is pushed to `source.json` on the `main` branch
3. Triggered automatically from an external repository workflow such as in [this package template](https://github.com/JustSleightly/VPM-Package-Template)

## 🏠 Customizing the Landing Page

The contents of the `Website` directory can be customized to change the appearance of the landing page. Most of the information will be automatically filled in with information from [`source.json`](source.json). Customizing the landing page by hand is not required.
