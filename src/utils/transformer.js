const {getMoreExperience, getMoreSkills} = require('../index')

const linkedinProfileTransformer = (profile, identifier) => {
    return new Promise(async (resolve, reject) => {
        let publications = null, volunteerExperience = null
        languages = null , projects = null ,education = null,
        yearsExperience = null;

        try {
            let experience = await getMoreExperience(identifier)
            let skills     = await getMoreSkills(identifier)

            if(skills && skills.elements) {
               skills = skills.elements.map((e) => e.name)
            }

            if(experience && experience.elements) {
                experience = experience.elements.map((e, idx) => {
                    if(experience.elements.length === idx + 1) {
                    
                       const start =  e.timePeriod.startDate.year;
                       const end   = new Date().getFullYear();
                       yearsExperience = end - start;
                    }

                    try {
                        return e.positions.map((e) => {
                                try {
                                    return {
                                        companyName: e.companyName,
                                        title: e.title,
                                        description: e.description,
                                        startYear: e.timePeriod.startDate.year,
                                        endYear: e.timePeriod.endDate ? e.timePeriod.endDate.year : null,
                                        companyIndustries: e.company ? e.company.industries : null,
                                        companySize: e.company ? e.company.employeeCountRange: null,
                                        locationName: e.locationName
                                    }     
                                } catch(e) {}
                                
                            })

                    } catch(e) {}
                   
                })

                experience.yearsExperience = yearsExperience
            }

            if (profile.volunteerExperienceView && profile.volunteerExperienceView.elements) {
                try {
                    volunteerExperience = profile.volunteerExperienceView.elements.map((e) => {
                        return {
                            role: e.role, 
                            organization: e.companyName, 
                            description: e.description
                        }
                    })
                } catch(e) {}
            }

        
            if (profile.publications && profile.publications.elements) {
                publications = profile.publications.elements.map((e) => {
                    try {
                        return {
                            name: e.name,
                            publisher: e.publisher,
                            description: e.description,
                            url: e.url,
                            otherAuthors: e.authors.map((e) => {
                                return {
                                    name: `${e.member.firstName} ${e.member.lastName}`,
                                    occupation: e.member.occupation,
                                    linkedinURI: e.member.publicIdentifier
                                }
                            })
                        }
                    } catch(e) {}
                })
            }
         
            if (profile.languageView && profile.languageView.elements) {
                try {
                    languages = profile.languageView.elements.map((e) => {
                        return e.name
                    })
                } catch(e) {}
            }

           
            if (profile.projectView && profile.projectView.elements) {
                projects = profile.projectView.elements.map((e) => {
                    try {
                        return {
                            name: e.title,
                            description: e.description,
                            url: e.url, 
                            timePeriod: e.timePeriod,
                            members: e.members.map((e) => {
                                try {
                                    return {
                                        name: `${e.member.firstName} ${e.member.lastName}`,
                                        occupation: e.member.occupation,
                                        linkedinURI: e.member.publicIdentifier
                                    }
                                } catch(e) {}
                            })
                        }

                    } catch(e) {}
                })
            }
          
            if (profile.education && profile.education.elements) {
                try {
                    education = profile.education.elements.map((e) => {
                        return {
                            institutionName: e.schoolName,
                            degreeName:      e.degreeName, 
                            fieldOfStudy:    e.fieldOfStudy,
                            timePeriod : e.timePeriod
                        }
                    })
                } catch(e) {}
            }

            const returnObj = {
                firstName: profile.profile.firstName,
                lastName: profile.profile.lastName,
                fullName: `${profile.profile.firstName} ${profile.profile.lastName}`,
                industry: profile.profile.industryName,
                location: profile.profile.locationName,
                countryCode: profile.profile.location.basicLocation.countryCode,
                currentOccupation: profile.profile.miniProfile.occupation,
                headline: profile.profile.headline,
                summary: profile.profile.summary,
                isStudent: profile.profile.student,
                photo : profile.profile.miniProfile.picture ? profile.profile.miniProfile.picture['com.linkedin.common.VectorImage'].rootUrl : null,
                education,
                projects,
                languages,
                publications,
                volunteerExperience,
                skills: skills, 
                experience: experience,
                
            }
            resolve(returnObj)
        } catch(e) {
            reject(e)
        }
    })
}


module.exports = {
    linkedinProfileTransformer
}