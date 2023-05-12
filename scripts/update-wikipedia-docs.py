#!/usr/bin/env python3

import argparse
import wikipedia
import json
from PIL import Image
import requests
from io import BytesIO
from os import path

parser = argparse.ArgumentParser(
  description='Generate .js and tech data from Wikipedia and freeciv rulesets')
parser.add_argument('-f', '--freeciv', required=True, help='path to (original) freeciv project')
parser.add_argument('-o', '--outdir', required=True, help='path to webapp output directory')
args = parser.parse_args()

webapp_dir = args.outdir
freeciv_dir = args.freeciv

src_data_dir = path.join(freeciv_dir, "data")

freeciv_wiki_doc = {};

# Remove translator qualification from names
def unqualify(name):
  return name.partition(':')[2] if (name.startswith("?")) else name

def fix_tech(tech_name):
  tech_name = unqualify(tech_name);

  if (tech_name == "Advanced Flight"): tech_name = "Aeronautics";
  if (tech_name == "AWACS"): tech_name = "Boeing E-3 Sentry";
  if (tech_name == "Rocketry"): tech_name = "Rocket";
  if (tech_name == "Stealth"): tech_name = "Stealth technology";
  if (tech_name == "Tactics"): tech_name = "Military tactics";
  if (tech_name == "The Republic"): tech_name = "Repubic";
  if (tech_name == "The Corporation"): tech_name = "Corporation";
  if (tech_name == "The Wheel"): tech_name = "Wheel";
  if (tech_name == "Archers"): tech_name = "Archery";
  if (tech_name == "Partisan"): tech_name = "Partisan military";
  if (tech_name == "Horsemen"): tech_name = "Equestrianism";
  if (tech_name == "Fighter"): tech_name = "Fighter aircraft";
  if (tech_name == "Carrier"): tech_name = "Aircraft carrier";
  if (tech_name == "Legion"): tech_name = "Roman legion";
  if (tech_name == "Riflemen"): tech_name = "Rifleman";
  if (tech_name == "Transport"): tech_name = "Troopship";
  if (tech_name == "Magellan's Expedition"): tech_name = "Ferdinand Magellan";
  if (tech_name == "Nuclear"): tech_name = "Nuclear weapon";
  if (tech_name == "Caravan"): tech_name = "Camel train";
  if (tech_name == "Aqueduct"): tech_name = "Aqueduct water supply";
  if (tech_name == "Barracks II"): tech_name = "Barracks";
  if (tech_name == "Barracks III"): tech_name = "Barracks";
  if (tech_name == "Research Lab"): tech_name = "Laboratory";
  if (tech_name == "Mfg. Plant"): tech_name = "Factory";
  if (tech_name == "Sewer System"): tech_name = "Sanitary_sewer";
  if (tech_name == "Space Structural"): tech_name = "Spacecraft";
  if (tech_name == "A.Smith's Trading Co."): tech_name = "Adam Smith";
  if (tech_name == "Colossus"): tech_name = "Colossus of Rhodes";
  if (tech_name == "Michelangelo's Chapel"): tech_name = "Sistine Chapel";
  if (tech_name == "Shakespeare's Theater"): tech_name = "William Shakespeare";
  if (tech_name == "Coinage"): tech_name = "Coining (mint)";
  if (tech_name == "SDI Defense"): tech_name = "Strategic Defense Initiative";
  if (tech_name == "Coastal Defense"): tech_name = "Coastal defence and fortification";
  if (tech_name == "Copernicus' Observatory"): tech_name = "Space observatory";
  if (tech_name == "Mech. Inf."): tech_name = "Mechanized infantry";
  if (tech_name == "Sun Tzu's War Academy"): tech_name = "Sun Tzu";
  if (tech_name == "Mobile Warfare"): tech_name = "Maneuver warfare";
  if (tech_name == "Leonardo's Workshop"): tech_name = "Leonardo da Vinci";
  if (tech_name == "SETI Program"): tech_name = "Search for extraterrestrial intelligence";
  if (tech_name == "J.S. Bach's Cathedral"): tech_name = "Johann Sebastian Bach";
  if (tech_name == "Marco Polo's Embassy"): tech_name = "Marco Polo";
  if (tech_name == "Pyramids"): tech_name = "Giza pyramid complex";
  if (tech_name == "Mass Transit"): tech_name = "Public transport";
  if (tech_name == "Spy"): tech_name = "Espionage";
  if (tech_name == "Workers"): tech_name = "Laborer";
  if (tech_name == "Space Component"): tech_name = "Spacecraft propulsion";
  if (tech_name == "Space Module"): tech_name = "Life support system";
  if (tech_name == "Space Structural"): tech_name = "Spacecraft design";
  if (tech_name == "Hydro Plant"): tech_name = "Hydroelectricity";
  if (tech_name == "Super Highways"): tech_name = "Controlled-access highway";
  if (tech_name == "Pikemen"): tech_name = "Pike square";
  if (tech_name == "Armor"): tech_name = "Armoured fighting vehicle";
  if (tech_name == "Port Facility"): tech_name = "Port";

  return tech_name;

def validate_image(image_url):
  return ((".png" in image_url.lower() or ".jpg" in image_url.lower())
          and "Ambox" not in image_url
          and "Berthabenzportrait" not in image_url
          and "Great_wall_of_china-mutianyu_3" not in image_url
          and "Chevalier" not in image_url
          and "Nuvola_apps_ksysv" not in image_url
          and "mile_Levassor" not in image_url
          and "Place_de_la_R" not in image_url and "Elizabeth" not in image_url
          and "Writing_systems_worldwide" not in image_url);

def download_wiki_page(tech_name):
  print(f"Downloading wiki data and image: {tech_name} -> {fix_tech(tech_name)}");
  page = wikipedia.page(fix_tech(tech_name), auto_suggest=True, redirect=True);

  image = next(
      (page.images[i]
       for i in range(len(page.images)) if validate_image(page.images[i])),
      None,
  )
  if image != None:
    response = requests.get(image)
    img = Image.open(BytesIO(response.content))
    image_width = 500;
    wpercent = (image_width/float(img.size[0]))
    hsize = int((float(img.size[1])*float(wpercent)))
    max_height = 450;

    hsize = min(hsize, max_height)
    img = img.resize((image_width,hsize), Image.ANTIALIAS)
    image = f"{page.title}.jpg";

    image_file = path.join(webapp_dir, 'images', 'wiki', f'{page.title}.jpg')
    img.convert('RGB').save(image_file)

  freeciv_wiki_doc[unqualify(tech_name)] = {"title" : page.title, "summary" : page.summary, "image" : image};


# FIXME: extract item names from the other supported rulesets too. An item
# name that don't appear in classic may still appear in another supported
# ruleset.

input_name = path.join(src_data_dir, 'classic', 'techs.ruleset')
print(f"Reading {input_name}")
with open(input_name, 'r') as f:
  lines = f.readlines()
techs = []
for line in lines:
  if line.startswith("name"):
    tech_line = line.split("\"");
    techs.append(tech_line[1]);

input_name = path.join(src_data_dir, 'classic', 'units.ruleset')
print(f"Reading {input_name}")
with open(input_name, 'r') as f:
  lines = f.readlines()
for line in lines:
  if line.startswith("name"):
    tech_line = line.split("\"");
    if ("unitclass" in tech_line[1]): continue;
    techs.append(tech_line[1]);

input_name = path.join(src_data_dir, 'classic', 'buildings.ruleset')
print(f"Reading {input_name}")
with open(input_name, 'r') as f:
  lines = f.readlines()
for line in lines:
  if line.startswith("name"):
    tech_line = line.split("\"");
    techs.append(tech_line[1]);

input_name = path.join(src_data_dir, 'classic', 'governments.ruleset')
print(f"Reading {input_name}")
with open(input_name, 'r') as f:
  lines = f.readlines()
for line in lines:
  if line.startswith("name"):
    tech_line = line.split("\"");
    techs.append(tech_line[1]);

for tech in techs:
  download_wiki_page(tech);

output_name = path.join(webapp_dir, 'javascript', 'freeciv-wiki-doc.js')
with open(output_name, 'w') as f:
  f.write("var freeciv_wiki_docs = "
          + json.dumps(freeciv_wiki_doc, sort_keys=True, indent=2) + ";\n");
print(f"Generated {output_name}")

print("\n*****************************************************")
print("Please verify manually that the images from Wikipedia")
print("are suited for the game and players of all ages.")
print("*****************************************************\n")
print("Downloading tech summaries from Wikipedia complete!")
