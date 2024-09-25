const Archive = require('../../../../lib/plugins/archive');
const NopCommand = require('../../../../lib/nopcommand');

describe('Archive Plugin', () => {
  let github;
  let log;
  let repo;
  let settings;
  let nop;

  beforeEach(() => {
    github = {
      repos: {
        get: jest.fn()
      }
    };
    log = {
      debug: jest.fn(),
      error: jest.fn()
    };
    repo = { owner: 'test-owner', repo: 'test-repo' };
    settings = {};
    nop = new NopCommand();
  });

  it('should return false if the repository is archived', async () => {
    github.repos.get.mockResolvedValue({ data: { archived: true } });

    const archive = new Archive(nop, github, repo, settings, log);
    const result = await archive.sync();

    expect(result.shouldContinue).toBe(false);
    expect(log.debug).toHaveBeenCalledWith('Repo test-owner/test-repo is archived, ignoring.');
  });

  it('should return true if the repository is not archived', async () => {
    github.repos.get.mockResolvedValue({ data: { archived: false } });

    const archive = new Archive(nop, github, repo, settings, log);
    const result = await archive.sync();

    expect(result.shouldContinue).toBe(true);
    expect(log.debug).toHaveBeenCalledWith('Repo test-owner/test-repo is not archived, proceed as usual.');
  });

  it('should handle errors gracefully', async () => {
    github.repos.get.mockRejectedValue(new Error('API error'));

    const archive = new Archive(nop, github, repo, settings, log);
    const result = await archive.sync();

    expect(result.shouldContinue).toBe(true);
    expect(log.error).toHaveBeenCalledWith('Error fetching repository details: Error: API error');
  });
});