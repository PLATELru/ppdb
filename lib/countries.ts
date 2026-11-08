import countriesJson from "../data/countries.json";
import { parties } from "./parties";
import { getCountryDirectory, type Country } from "./country-directory";

export const countryDirectory = getCountryDirectory(countriesJson.countries as Country[], parties);
