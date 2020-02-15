const { LI_CDN } = require('./constants');
const {
    scrubIdFromUrn,
    extractRootDomain,
} = require('./helpers');

/**
 * It returns the path to a image in a linkedin response.
 * @param  {Object} image image object of a linkedin entity.
 * @return {String}
 */
const scrubPathToResource = (resource) => {
    if (resource.constructor !== Object) {
        return '';
    }

    const key = Object.keys(resource)[0];
    let resourcePath = resource[key].rootUrl || '';
    const artifacts = resource[key].artifacts;

    if (resourcePath && artifacts.length) {
        const resourceSegment = artifacts[artifacts.length - 1].fileIdentifyingUrlPathSegment || '';
        resourcePath += resourceSegment;
    }

    return resourcePath;
}

/**
 * Scrubs company information from LinkedIn Response.
 * @param  {Object} companyResponse
 * @return {Object}
 */
const transformCompany = (companyResponse) => {
    const company = { source: 'linkedin' };
    if (!companyResponse.name) {
        return companyResponse;
    }

    company.affiliatedCompanies = companyResponse.affiliatedCompanies || [];

    company.pageUrl = companyResponse.companyPageUrl || '';
    company.domain = extractRootDomain(companyResponse.companyPageUrl);
    company.type = (companyResponse.hasOwnProperty('companyType')) ? companyResponse.companyType.localizedName : '';
    company.confirmedLocations = companyResponse.confirmedLocations || [];
    company.description = companyResponse.description;
    company.companyUrn = companyResponse.entityUrn;
    company.name = companyResponse.name;
    company.specialities = companyResponse.specialities || [];
    company.universalName = companyResponse.universalName;
    company.linkedInPageUrl = companyResponse.url || '';
    company.staffCountRange = companyResponse.staffCountRange || {};

    company.parentCompanyId = scrubIdFromUrn(companyResponse.parentCompany);
    company.companyId = scrubIdFromUrn(companyResponse.entityUrn);

    if (companyResponse.hasOwnProperty('foundedOn')) {
        company.foundedOn = companyResponse.foundedOn.year || '';
    }

    if (companyResponse.hasOwnProperty('companyIndustries')) {
        company.industries = companyResponse.companyIndustries.map(c => c.localizedName) || [];
    }

    if (companyResponse.hasOwnProperty('headquarter')) {
        company.city = companyResponse.headquarter.city || '';
        company.country = companyResponse.headquarter.country || '';
        company.geographicArea = companyResponse.headquarter.geographicArea || '';
        company.addr1 = companyResponse.headquarter.line1 || '';
        company.addr2 = companyResponse.headquarter.line2 || '';
        company.postalCode = companyResponse.headquarter.postalCode || '';
    }

    if (companyResponse.hasOwnProperty('followingInfo')) {
        company.linkedInFollowerCount = companyResponse.followingInfo.followerCount || 0;
    }

    if (companyResponse.hasOwnProperty('staffCount')) {
        company.staffCount = companyResponse.staffCount || 0;
    }

    if (companyResponse.hasOwnProperty('logo') && companyResponse.logo.hasOwnProperty('image')) {
        company.logo = scrubPathToResource(companyResponse.logo.image) || '';
    }

    if (companyResponse.hasOwnProperty('backgroundCoverImage') && companyResponse.backgroundCoverImage.hasOwnProperty('image')) {
        company.backgroundCoverImage = scrubPathToResource(companyResponse.backgroundCoverImage.image) || '';
    }

    if (companyResponse.hasOwnProperty('backgroundCoverPhoto')) {
        company.backgroundCoverPhoto = scrubPathToResource(companyResponse.backgroundCoverPhoto) || '';
    }

    return company;
}

/**
 * Scrubs member object in LinkedIn Response
 * @param  {Object} member Member object
 * @return {Object}
 */
const scrubMemberInfo = (member) => {
    if (!member) {
        return { firstName: '', lastName: '', occupation: '', publicIdentifier: '' };
    }

    const memberInfo = {
        firstName: (member.member && member.member.firstName) ? member.member.firstName : '',
        lastName: (member.member && member.member.lastName) ? member.member.lastName : '',
        occupation: (member.member && member.member.occupation) ? member.member.occupation : '',
        publicIdentifier: (member.member && member.member.publicIdentifier) ? member.member.publicIdentifier : '',
    };

    if (member.member && member.member.hasOwnProperty('picture')) {
        memberInfo.picture = scrubPathToResource(member.member.picture);
    }
    return memberInfo;
}

/**
 * Scrubs patent information from LinkedIn Response.
 * @param  {Object} patent Original patentView object
 * @return {Object}
 */
const scrubPatentInfo = (patent) => {
    const patentInfo = {
        applicationDate: patent.filingDate || {},
        author: '',
        coAuthors: '',
        currentAssignee: '',
        description: patent.description || '',
        endDate: '',
        grantDate: patent.issueDate || {},
        idNumber: patent.applicationNumber || '',
        legalType: '',
        name: patent.title || '',
        previousAssignee: '',
        resources: {
            label: '',
            url: patent.url || '',
        },
        number: patent.number || '',
        pending: patent.pending || false,
    };

    if (patent.hasOwnProperty('inventors') && patent.inventors.length) {
        const inventors = patent.inventors
            .filter(inventor => inventor.hasOwnProperty('member'))
            .map(inventor => scrubMemberInfo(inventor.member));
        patentInfo.inventors = inventors;
    }
    return patentInfo;
}

/**
 * Scrubs publication information from LinkedIn response.
 * @param  {Object} publication Original publicationView object
 * @return {Object}
 */
const scrubPublicationInfo = (publication) => {
    const publicationInfo = {
        name: publication.name || '',
        publisher: publication.publisher || '',
        releaseDate: '',
        url: publication.url || '',
        summary: publication.description || '',
    };

    if (typeof(publication.date) === 'object' && typeof(publication.date.year)!=='undefined') {
        publicationInfo.releaseDate = publication.date.year + '-' + publication.date.month + '-' + publication.date.day;
    }

    if (publication.hasOwnProperty('authors') && publication.authors.length) {
        publicationInfo.authors = publication.authors.map(author => scrubMemberInfo(author));
    }

    return publicationInfo;
}

/**
 * Scrubs project information from LinkedIn response.
 * @param  {Object} project Original projectView object
 * @return {Object}
 */
const scrubProjectInfo = (project) => {
    const projectInfo = {
        name: project.title || '',
        description: project.description || '',
        highlights: [],
        keywords: [],
        startDate: '',
        endDate: '',
        url: project.url || '',
        roles: [],
        entity: '',
        type: '',
    };

    if (project.timePeriod && typeof(project.timePeriod) === 'object') {
        if (project.timePeriod.startDate && typeof(project.timePeriod.startDate) === 'object') {
            projectInfo.startDate = project.timePeriod.startDate.year + '-12-31';
        }
        if (project.timePeriod.endDate && typeof(project.timePeriod.endDate) === 'object') {
            projectInfo.endDate = project.timePeriod.endDate.year + '-12-31';
        }
    }

    if (project.hasOwnProperty('members') && project.members.length) {
        project.members = project.members.map(member => scrubMemberInfo(member));
    }
    return projectInfo;
}

/**
 * Scrubs volunteer experience information from LinkedIn response.
 * @param  {Object} experience Original volunteerExperienceView object
 * @return {Object}
 */
const scrubVolunteerInfo = (experience) => {
    const volunteerInfo = {
        organization: experience.companyName || '',
        position: experience.role || {},
        url: '',
        startDate: '',
        endDate: '',
        summary: experience.description || '',
        highlights: [],
    };

    if (experience.timePeriod && typeof(experience.timePeriod) === 'object') {
        if (typeof(experience.timePeriod.endDate) === 'object' && experience.timePeriod.endDate!==null) {
            volunteerInfo.endDate = experience.timePeriod.endDate.year + '-' + experience.timePeriod.endDate.month + '-31';
        }
        if (typeof(experience.timePeriod.startDate) === 'object' && experience.timePeriod.startDate!==null) {
            volunteerInfo.startDate = experience.timePeriod.startDate.year + '-' + experience.timePeriod.startDate.month + '-31';
        }
    }

    return volunteerInfo;
}

/**
 * Scrubs position information from LinkedIn response.
 * @param  {Object} position Original positionView object
 * @return {Object}
 */
const scrubPositionInfo = (position) => {
    const positionInfo = {
        name: position.companyName || '',
        location: position.locationName || '',
        description: '',
        position: position.title || '',
        url: '',
        startDate: '',
        endDate: '',
        summary: position.description || '',
        highlights: [],
    };

    if (position.timePeriod && typeof(position.timePeriod) === 'object') {
        if (position.timePeriod.endDate && typeof(position.timePeriod.endDate) === 'object') {
            positionInfo.endDate = position.timePeriod.endDate.year + '-' + position.timePeriod.endDate.month + '-31';
        }
        if (position.timePeriod.startDate && typeof(position.timePeriod.startDate) === 'object') {
            positionInfo.startDate = position.timePeriod.startDate.year + '-' + position.timePeriod.startDate.month + '-31';
        }
    }

    if (position.hasOwnProperty('company')) {
        positionInfo.company = {
            urnId: scrubIdFromUrn(position.companyUrn),
            employeeCountRange: position.company.employeeCountRange || {},
            logo: '',
        };

        if (position.company.hasOwnProperty('miniCompany') &&
            position.company.miniCompany.hasOwnProperty('logo')) {
            positionInfo.company.logo = scrubPathToResource(position.company.miniCompany.logo);
        }
        positionInfo.description = (position.company.industries || []).join('|');
    }
    return positionInfo;
}

/**
 * Scrubs education information from LinkedIn response.
 * @param  {Object} edu Original educationView object
 * @return {Object}
 */
const scrubEducationInfo = (edu) => {
    const eduInfo = {
        institution: edu.schoolName || '',
        area: edu.fieldOfStudy || '',
        studyType: edu.degreeName || '',
        startDate: '',
        endDate: '',
        gpa: edu.grade || '',
        courses: (edu.activities || '').split('\n'),
    };

    if (edu.timePeriod && typeof(edu.timePeriod) === 'object') {
        if (edu.timePeriod.startDate && typeof(edu.timePeriod.startDate) === 'object') {
            eduInfo.startDate = edu.timePeriod.startDate.year + '-12-31';
        }
        if (edu.timePeriod.endDate && typeof(edu.timePeriod.endDate) === 'object') {
            eduInfo.endDate = edu.timePeriod.endDate.year + '-12-31';
        }
    }

    if (edu.hasOwnProperty('school')) {
        eduInfo.school = {
            active: edu.school.active || false,
            name: edu.school.schoolName || ''
        };

        if (edu.school.hasOwnProperty('logo')) {
            eduInfo.school.logo = scrubPathToResource(edu.school.logo);
        }
    }

    return eduInfo;
}

/**
 * Scrubs website info from contactInfo LinkedIn response.
 * @param  {Object} website Website object
 * @return {Object}
 */
const scrubWebsiteInfo = (website)  => {
    return website.url || '';
}

/**
 * Takes a response from LinkedIn API. Manipulate its fields, tags the source
 * and returns a formatted object.
 * @param  {Object} profileResponse LinkedIn Profile Information.
 * @return {Object} Object that matches JSON Resume Schema (https://github.com/jsonresume/resume-schema).
 */
const transformProfile = (profileResponse) => {
    const profile = {
        'basics': {
            'name' : '',
            'label' : '',
            'picture': '',
            'email' : '',
            'phone' : '',
            'url' : '',
            'summary' : '',
            'location': {
                'address' : '',
                'postalCode' : '',
                'city' : '',
                'countryCode' : '',
                'region' : ''
            },
            'profiles': [],
            'original': profileResponse,
        },
        'work': [],
        'volunteer': [],
        'education': [],
        'awards': [],
        'publications': [],
        'skills': [],
        'languages': [],
        'interests': [],
        'references': [],
        'meta': {
            'source': 'linkedin',
            'canonical': 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
            'version': '1.0.0',
            'lastModified': '2018-12-24T15:53:00',
            'identifier': profileResponse.identifier,
            'publicIdentifier': '',
            'profileId': '',
            'urnId': '',
        },
    };

    if (!profileResponse.profile || !profileResponse.profile.firstName) {
        return profile;
    }

    profile.meta.identifier = profileResponse.profile.miniProfile.publicIdentifier || profileResponse.identifier;
    profile.meta.publicIdentifier = scrubIdFromUrn(profileResponse.profile.miniProfile.publicIdentifier) || '';
    profile.meta.profileId = scrubIdFromUrn(profileResponse.profile.miniProfile.entityUrn || profileResponse.profile.entityUrn) || '';
    profile.meta.urnId = scrubIdFromUrn(profileResponse.profile.miniProfile.objectUrn) || '';

    const firstName = profileResponse.profile.firstName || profileResponse.profile.miniProfile.firstName || '';
    const lastName = profileResponse.profile.lastName || profileResponse.profile.miniProfile.lastName || '';
    profile.basics.name = `${firstName} ${lastName}`;
    profile.basics.label = profileResponse.profile.headline || '';
    profile.basics.email = profileResponse.emailAddress || '';
    profile.basics.summary = profileResponse.profile.summary || '';
    profile.basics.location = {
        address: profileResponse.profile.address || '',
        postalCode: profileResponse.profile.location.basicLocation.postalCode || '',
        city: profileResponse.profile.locationName || '',
        countryCode: profileResponse.profile.location.basicLocation.countryCode || '',
    };
    profile.basics.industry = profileResponse.profile.industryName || '';
    profile.basics.occupation = profileResponse.profile.miniProfile.occupation || '';
    profile.basics.birthDate = '';

    if (profileResponse.birthDateOn && typeof(profileResponse.birthDateOn) === 'object') {
        const dt = profileResponse.birthDateOn;
        profile.basics.birthDate = `${dt.year || '1900'}-${dt.month}-${dt.day}`;
    }

    if (profileResponse.hasOwnProperty('phoneNumbers')) {
        profile.basics.phone = profileResponse.phoneNumbers.join('|');
    }

    if (profileResponse.hasOwnProperty('twitterHandles')) {
        profile.basics.profiles = profileResponse.twitterHandles.map(twitter => {
            return {
                'network' : 'Twitter',
                'username' : twitter.name,
                'url' : `https://twitter.com/${twitter.name}`,
            };
        }) || [];
    }

    if (profile.meta.publicIdentifier) {
        profile.basics.profiles.push({
            'network' : 'LinkedIn',
            'username' : profile.meta.publicIdentifier,
            'url' : `https://www.linkedin.com/in/${profile.meta.publicIdentifier}`,
        });
    }

    if (profileResponse.profile.hasOwnProperty('miniProfile') &&
        profileResponse.profile.miniProfile.hasOwnProperty('picture')) {
        profile.basics.picture = scrubPathToResource(profileResponse.profile.miniProfile.picture);
    }

    if (profileResponse.hasOwnProperty('websites') && profileResponse.websites.length > 0) {
        profile.basics.url = (profileResponse.websites.map(w => scrubWebsiteInfo(w)) || []).join('|');
    }

    // there seems to be a bug with LinkedIns API where headline and occupation
    // are identical. Occupation should be current title at current company.
    if (profile.basics.headline === profile.basics.occupation) {
        const currentPositions = profileResponse.positionView.elements
            .filter(p => p.hasOwnProperty('timePeriod') && p.timePeriod.hasOwnProperty('startDate') && !p.timePeriod.hasOwnProperty('endDate')) || [];
        const currentPosition = currentPositions[0] || {};
        profile.basics.occupation = currentPosition.title || '';
    }

    profile.work = profileResponse.positionView.elements.map(p => scrubPositionInfo(p)) || [];
    profile.volunteer = profileResponse.volunteerExperienceView.elements.map(v => scrubVolunteerInfo(v)) || [];
    profile.education = profileResponse.educationView.elements.map(e => scrubEducationInfo(e)) || [];
    // profile.legal = profileResponse.patentView.elements.map(p => scrubPatentInfo(p)) || [];
    profile.publications = profileResponse.publicationView.elements.map(p => scrubPublicationInfo(p)) || [];
    profile.skills = profileResponse.skillView.elements.map(skill => { return { name: skill.name }; }) || [];
    profile.languages = profileResponse.languageView.elements.map(lang => { return { language: lang.name }; }) || [];
    profile.projects = profileResponse.projectView.elements.map(p => scrubProjectInfo(p)) || [];

    return profile;
}

module.exports = {
    transformCompany,
    transformProfile,
}
