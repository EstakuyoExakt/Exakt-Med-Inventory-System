/**
 * Projects Mock Data (Parent / Mother of Facilities)
 * 
 * Each project represents an overarching program or mother network that
 * links to child facilities by their IDs.
 */

export const projects = [
  {
    id: 1,
    name: "Taytay Healthcare Project",
    facilityIds: [12, 13, 14],
  },
  {
    id: 2,
    name: "Quezon City Medical Network",
    facilityIds: [1, 2, 7],
  },
  {
    id: 3,
    name: "Taguig & East Medical Consortium",
    facilityIds: [3, 6, 8],
  },
  {
    id: 4,
    name: "South Manila & Coastal Health Initiative",
    facilityIds: [4, 5, 9],
  },
  {
    id: 5,
    name: "Central Metro Pediatric & Community Care",
    facilityIds: [10, 11],
  },
];

export default projects;

