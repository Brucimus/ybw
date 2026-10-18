/**
 * Storage Layer for Bill Watanabe's Personal Website & Archives
 * Manages Stories, Photo Vault, LocalStorage persistence, and Export/Import.
 */

const STORAGE_KEYS = {
  STORIES: 'bill_watanabe_stories_v1',
  PHOTOS: 'bill_watanabe_photos_v1',
};

// Initial default photography vault
const DEFAULT_PHOTOS = [
  {
    id: 'photo_bill_portrait',
    title: 'Bill Watanabe in His Archive Study',
    year: '2024',
    location: 'Los Angeles, CA',
    caption: 'Reflecting on over 40 years of community organizing, social services, and oral history preservation in Little Tokyo.',
    url: 'images/bill_portrait.jpg',
    tags: ['Portrait', 'Archives', 'Leadership'],
    dateAdded: '2026-10-16'
  },
  {
    id: 'photo_little_tokyo_historic',
    title: 'Historic First & San Pedro Streets',
    year: 'c. 1978',
    location: 'Little Tokyo Historic District, Los Angeles',
    caption: 'The vibrant heart of Little Tokyo during an era of redevelopment fights and community resurgence. Notice the classic storefront signs and lanterns.',
    url: 'images/little_tokyo_historic.jpg',
    tags: ['Little Tokyo', 'History', 'Streetscapes'],
    dateAdded: '2026-10-16'
  },
  {
    id: 'photo_community_center',
    title: 'LTSC Founding Committee Working Session',
    year: '1980',
    location: 'Little Tokyo Service Center original office',
    caption: 'Founding members, Issei elders, and youth organizers reviewing bilingual community outreach plans and social service survey blueprints.',
    url: 'images/community_center.jpg',
    tags: ['LTSC', 'Community Organizing', 'Historic Milestone'],
    dateAdded: '2026-10-16'
  },
  {
    id: 'photo_community_garden',
    title: 'Elders Tending the Community Garden',
    year: '1984',
    location: 'Sawtelle & West LA Japanese Community Garden',
    caption: 'Senior gardeners and community volunteers carefully pruning bonsai and harvesting fresh daikon and persimmons in the morning sun.',
    url: 'images/community_garden.jpg',
    tags: ['Community Garden', 'Elders', 'Heritage'],
    dateAdded: '2026-10-16'
  },
  {
    id: 'photo_festival_gathering',
    title: 'Nisei Week Street Festival & Taiko Celebration',
    year: '1986',
    location: 'First Street, Little Tokyo',
    caption: 'Hundreds gathered under rows of paper lanterns to watch taiko drumming and ondo dancing, uniting generations of the Nikkei diaspora.',
    url: 'images/festival_gathering.jpg',
    tags: ['Nisei Week', 'Culture', 'Celebration', 'Festivals'],
    dateAdded: '2026-10-16'
  }
];

// Initial stories illustrating both side-by-side callouts and appendix gallery layouts
const DEFAULT_STORIES = [
  {
    id: 'founding-of-ltsc-memoir',
    title: 'The Birth of the Little Tokyo Service Center',
    subtitle: 'How a folding card table and two volunteers grew into a lifeline for thousands of immigrant families.',
    date: 'October 12, 2024',
    category: 'Community Building',
    author: 'Bill Watanabe',
    readTime: '6 min read',
    featuredImage: 'images/community_center.jpg',
    summary: 'When we first opened our doors in 1980, we didn’t have a budget, state-of-the-art computers, or executive boardrooms. What we had was a shared determination that our elders and newcomers deserved dignity and care in their own language.',
    paragraphs: [
      'In the late 1970s, downtown Los Angeles was undergoing a whirlwind of corporate redevelopment. Tall glass towers were rising along Figueroa and Grand, while just blocks away, elderly Issei (first-generation Japanese immigrants) living in single-room occupancy hotels along First and San Pedro streets were struggling in silence. Many spoke little English, struggled to navigate Medicare, and faced sudden displacement as older hotels were being rezoned or demolished.',
      'A small group of social workers, young activists fresh out of college, and bilingual church volunteers gathered one evening in the basement of a local church. We asked ourselves a simple question: If our community does not build safety nets for our own pioneers, who will? That evening, the vision for the Little Tokyo Service Center (LTSC) was born.',
      'We managed to secure a tiny, narrow office that smelled like old paper and roasted green tea. Our entire administrative infrastructure consisted of two second-hand desks donated by a neighborhood law office, a rotary phone, and a folding card table where we translated letters from the Social Security administration. In those first weeks, we assisted seniors with medical forms, found emergency housing, and set up translation hotlines.',
      'What made our work distinctive was our philosophy of holistic care. We realized early on that an elder coming in for rent assistance was often also dealing with social isolation, chronic illness, and the psychological trauma of post-war resettlement. You could not treat one symptom without honoring the whole human being and their cultural heritage.',
      'Over the following decades, LTSC grew from that humble card table into an organization providing affordable housing, mental health counseling, child development centers, and small business preservation across Southern California. Yet whenever I walk down First Street today and see young families mingling with seniors, I am reminded that every great community institution begins with ordinary people who simply refuse to look the other way.'
    ],
    // Side Photos: Anchored to a designated paragraph index (0-based)
    sidePhotos: [
      {
        paragraphIndex: 1, // Displays alongside paragraph 2 ("A small group of social workers...")
        photoId: 'photo_community_center',
        caption: 'Founding organizers and community elders reviewing the initial service survey in 1980.',
        position: 'right'
      }
    ],
    // Appendix Photos: Rich photographic appendix at the end of the blog post
    appendixPhotos: [
      {
        photoId: 'photo_little_tokyo_historic',
        caption: 'First Street during the late 1970s redevelopment era, showing the neighborhood context when LTSC opened its initial storefront.',
        notes: 'Photo courtesy of Little Tokyo Historical Society archives.'
      },
      {
        photoId: 'photo_bill_portrait',
        caption: 'Bill Watanabe reflecting in his personal study surrounded by four decades of community logs and oral history tapes.',
        notes: 'Photographed in Los Angeles, 2024.'
      }
    ]
  },
  {
    id: 'walking-down-first-street',
    title: 'Walking Down First Street: Memories of a Living Historic District',
    subtitle: 'From neon chashu signs to rhythmic summer taiko beats, sensory reflections on four square blocks of resilience.',
    date: 'August 24, 2024',
    category: 'Little Tokyo Chronicles',
    author: 'Bill Watanabe',
    readTime: '5 min read',
    featuredImage: 'images/little_tokyo_historic.jpg',
    summary: 'Little Tokyo is more than just a geographic coordinate in Los Angeles; it is a spiritual home for generations of Japanese Americans who weathered discrimination, internment, and rapid urban change.',
    paragraphs: [
      'There is a particular golden hour light that strikes the brick facades along First Street in the late afternoon. As the sun dips behind the downtown skyscrapers, the red and white paper lanterns begin to glow, and the aroma of simmering dashi, fresh ramen broth, and sweet imagawayaki wafts out of shop doors that have stood for more than fifty years.',
      'To an outsider, Little Tokyo might look like a compact historic enclave of restaurants and gift shops. But to those of us who have walked these sidewalks for half a century, every doorway holds a story. The hardware store where three generations of gardeners bought their shears; the manju shop where aunts debated community gossip while packing pink and white mochi for New Year celebrations.',
      'During Nisei Week every August, the street undergoes an electric metamorphosis. The traffic is halted, and the asphalt becomes an open-air stage for ondo dancers in matching yukata yukatas and taiko drummers whose rhythmic thunder echoes off the second-story windows. Grandparents who walked into wartime assembly centers with numbers pinned to their coats now sit in folding lawn chairs, watching their great-grandchildren leap and beat the drums with unbridled joy.',
      'Preserving this district has never been an effortless journey. We have fought freeway expansions, real estate speculation, and the relentless pressures of gentrification. Yet through community ownership, historic easements, and collective passion, Little Tokyo remains one of only three historic Japantowns surviving in the United States today.'
    ],
    sidePhotos: [
      {
        paragraphIndex: 0, // Alongside paragraph 1 ("There is a particular golden hour light...")
        photoId: 'photo_little_tokyo_historic',
        caption: 'Afternoon street life along First Street in the late 1970s, lined with family-owned storefronts and vintage cars.',
        position: 'right'
      },
      {
        paragraphIndex: 2, // Alongside paragraph 3 ("During Nisei Week...")
        photoId: 'photo_festival_gathering',
        caption: 'Nisei Week taiko drummers performing on First Street, surrounded by generations of community members.',
        position: 'right'
      }
    ],
    appendixPhotos: [
      {
        photoId: 'photo_community_garden',
        caption: 'Community elders cultivating traditional vegetables in nearby neighborhood plots, supplying fresh greens to local community potlucks.',
        notes: 'Part of the Nikkei Senior Cultural Exchange series.'
      }
    ]
  },
  {
    id: 'cultivating-roots-community-gardens',
    title: 'Cultivating Roots: The Elders and the Community Garden',
    subtitle: 'What the patient tending of bonsai, daikon, and persimmons taught us about organizing people.',
    date: 'June 18, 2024',
    category: 'Reflections & Heritage',
    author: 'Bill Watanabe',
    readTime: '4 min read',
    featuredImage: 'images/community_garden.jpg',
    summary: 'Gardening was never merely an agricultural hobby for our elders; it was an act of quiet resilience, cultivating beauty from tough soil and passing generational wisdom without words.',
    paragraphs: [
      'In the early 1980s, when we sought out spaces where our senior community members could gather during the weekdays, an unused strip of land was offered to us. The soil was compacted and dry, strewn with gravel and urban weeds. Most people would have seen a desolate vacant lot; the elders saw an abundant harvest waiting to happen.',
      'Within three weeks, they had cleared the stone, turned the topsoil with hand shovels, built cedar trellises for bitter melon and wisteria, and laid down drip lines. Watching Mr. Tanaka and Mrs. Fujimoto work side by side was a masterclass in quiet collaboration. Neither raised their voice; each anticipated what the other needed next.',
      'I often found myself visiting the garden after long, stressful city council budget hearings. Sitting on a wooden bench beneath the shade of miniature pines, listening to elders discuss the weather in Japanese while clipping tomato vines, everything gained perspective. Community organizing is very much like gardening: you cannot force a seed to sprout overnight, but if you prepare good soil, provide consistent nourishment, and protect young seedlings from harsh storms, life will flourish.'
    ],
    sidePhotos: [
      {
        paragraphIndex: 1, // Alongside paragraph 2 ("Within three weeks, they had cleared...")
        photoId: 'photo_community_garden',
        caption: 'Mr. Tanaka and community elders cultivating bonsai and seasonal vegetables at the neighborhood garden, 1984.',
        position: 'right'
      }
    ],
    appendixPhotos: [
      {
        photoId: 'photo_bill_portrait',
        caption: 'Bill Watanabe reviewing historical records of community garden initiatives across Southern California.',
        notes: 'Los Angeles Archive Collection.'
      }
    ]
  }
];

class StoryArchiveStorage {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.PHOTOS)) {
      this.savePhotos(DEFAULT_PHOTOS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STORIES)) {
      this.saveStories(DEFAULT_STORIES);
    }
  }

  // Photo Vault methods
  getPhotos() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PHOTOS);
      return data ? JSON.parse(data) : DEFAULT_PHOTOS;
    } catch (e) {
      console.error('Error reading photos from localStorage', e);
      return DEFAULT_PHOTOS;
    }
  }

  getPhotoById(id) {
    const photos = this.getPhotos();
    return photos.find(p => p.id === id) || null;
  }

  savePhotos(photos) {
    try {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
    } catch (e) {
      console.error('Error saving photos to localStorage', e);
      throw e;
    }
  }

  addPhoto(photoData) {
    const photos = this.getPhotos();
    const newPhoto = {
      id: photoData.id || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: photoData.title || 'Untitled Photo',
      year: photoData.year || 'Unknown',
      location: photoData.location || '',
      caption: photoData.caption || '',
      url: photoData.url, // Base64 or URL
      tags: Array.isArray(photoData.tags) ? photoData.tags : (photoData.tags ? photoData.tags.split(',').map(t => t.trim()) : ['Community']),
      dateAdded: new Date().toISOString().split('T')[0]
    };
    photos.unshift(newPhoto);
    this.savePhotos(photos);
    return newPhoto;
  }

  deletePhoto(id) {
    let photos = this.getPhotos();
    photos = photos.filter(p => p.id !== id);
    this.savePhotos(photos);
    return true;
  }

  // Stories methods
  getStories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORIES);
      return data ? JSON.parse(data) : DEFAULT_STORIES;
    } catch (e) {
      console.error('Error reading stories from localStorage', e);
      return DEFAULT_STORIES;
    }
  }

  getStoryById(id) {
    const stories = this.getStories();
    return stories.find(s => s.id === id) || null;
  }

  saveStories(stories) {
    try {
      localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
    } catch (e) {
      console.error('Error saving stories to localStorage', e);
      throw e;
    }
  }

  addStory(storyData) {
    const stories = this.getStories();
    
    // Estimate reading time from text content
    const totalWords = (storyData.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(totalWords / 180));
    
    const newStory = {
      id: storyData.id || `story-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: storyData.title || 'Untitled Story',
      subtitle: storyData.subtitle || '',
      date: storyData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      category: storyData.category || 'Reflections & Heritage',
      author: storyData.author || 'Bill Watanabe',
      readTime: `${readMinutes} min read`,
      featuredImage: storyData.featuredImage || (storyData.sidePhotos && storyData.sidePhotos[0]?.url) || 'images/little_tokyo_historic.jpg',
      summary: storyData.summary || (storyData.paragraphs && storyData.paragraphs[0] ? storyData.paragraphs[0].slice(0, 160) + '...' : ''),
      paragraphs: Array.isArray(storyData.paragraphs) ? storyData.paragraphs : [],
      sidePhotos: Array.isArray(storyData.sidePhotos) ? storyData.sidePhotos : [],
      appendixPhotos: Array.isArray(storyData.appendixPhotos) ? storyData.appendixPhotos : []
    };

    stories.unshift(newStory);
    this.saveStories(stories);
    return newStory;
  }

  updateStory(id, updatedFields) {
    const stories = this.getStories();
    const index = stories.findIndex(s => s.id === id);
    if (index === -1) return null;

    stories[index] = { ...stories[index], ...updatedFields };
    this.saveStories(stories);
    return stories[index];
  }

  deleteStory(id) {
    let stories = this.getStories();
    stories = stories.filter(s => s.id !== id);
    this.saveStories(stories);
    return true;
  }

  // Backup & Restore
  exportArchiveJSON() {
    const exportObject = {
      exportedAt: new Date().toISOString(),
      source: 'Bill Watanabe Personal Website & Archives',
      stories: this.getStories(),
      photos: this.getPhotos()
    };
    return JSON.stringify(exportObject, null, 2);
  }

  importArchiveJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.stories && Array.isArray(parsed.stories)) {
        this.saveStories(parsed.stories);
      }
      if (parsed.photos && Array.isArray(parsed.photos)) {
        this.savePhotos(parsed.photos);
      }
      return true;
    } catch (e) {
      console.error('Failed to import archive JSON', e);
      return false;
    }
  }

  resetToDefaults() {
    this.savePhotos(DEFAULT_PHOTOS);
    this.saveStories(DEFAULT_STORIES);
  }
}

// Export singleton instance
window.storyArchiveStorage = new StoryArchiveStorage();
